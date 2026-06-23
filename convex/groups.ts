import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Member caps include the owner. Free owners host up to 3; Premium up to 15.
export const FREE_CAP = 3;
export const PREMIUM_CAP = 15;

// Unambiguous code alphabet (no 0/O/1/I) for shareable invite codes.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

async function requireClerkId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("You must be signed in.");
  return identity.subject;
}

async function isPremium(
  ctx: QueryCtx | MutationCtx,
  clerkId: string
): Promise<boolean> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
  return user?.stripeSubscriptionStatus === "active";
}

// A group's member cap is determined by whether its OWNER has Premium.
async function capForOwner(
  ctx: QueryCtx | MutationCtx,
  ownerId: string
): Promise<number> {
  return (await isPremium(ctx, ownerId)) ? PREMIUM_CAP : FREE_CAP;
}

export const createGroup = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const clerkId = await requireClerkId(ctx);
    const name = args.name.trim();
    if (!name) throw new ConvexError("Please enter a group name.");
    if (name.length > 40) throw new ConvexError("Group name is too long.");

    // One group per owner: you must delete your existing group first.
    const existingOwned = await ctx.db
      .query("groups")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", clerkId))
      .first();
    if (existingOwned) {
      throw new ConvexError(
        "You can only own one group. Delete your current group to create a new one."
      );
    }

    // Generate a unique invite code (retry on the rare collision).
    let inviteCode = makeCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query("groups")
        .withIndex("by_inviteCode", (q) => q.eq("inviteCode", inviteCode))
        .unique();
      if (!clash) break;
      inviteCode = makeCode();
    }

    const now = new Date().toISOString();
    const groupId = await ctx.db.insert("groups", {
      name,
      ownerId: clerkId,
      inviteCode,
      createdAt: now,
    });
    await ctx.db.insert("groupMembers", {
      groupId,
      userId: clerkId,
      joinedAt: now,
    });
    return { groupId, inviteCode };
  },
});

export const joinByCode = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const clerkId = await requireClerkId(ctx);
    const code = args.inviteCode.trim().toUpperCase();
    const group = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .unique();
    if (!group) throw new ConvexError("No group found with that invite code.");

    const already = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", group._id).eq("userId", clerkId)
      )
      .unique();
    if (already) return { groupId: group._id };

    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", group._id))
      .collect();
    const cap = await capForOwner(ctx, group.ownerId);
    if (members.length >= cap) {
      throw new ConvexError(
        cap === FREE_CAP
          ? `This group is full (${FREE_CAP} members). The owner can upgrade to Premium to allow up to ${PREMIUM_CAP}.`
          : `This group is full (${PREMIUM_CAP} members).`
      );
    }

    await ctx.db.insert("groupMembers", {
      groupId: group._id,
      userId: clerkId,
      joinedAt: new Date().toISOString(),
    });
    return { groupId: group._id };
  },
});

async function deleteGroupAndMembers(ctx: MutationCtx, groupId: Id<"groups">) {
  const members = await ctx.db
    .query("groupMembers")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
    .collect();
  for (const m of members) await ctx.db.delete(m._id);
  await ctx.db.delete(groupId);
}

export const leaveGroup = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const clerkId = await requireClerkId(ctx);
    const group = await ctx.db.get(args.groupId);
    if (!group) return { disbanded: false };
    // The owner leaving disbands the whole group.
    if (group.ownerId === clerkId) {
      await deleteGroupAndMembers(ctx, args.groupId);
      return { disbanded: true };
    }
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", clerkId)
      )
      .unique();
    if (membership) await ctx.db.delete(membership._id);
    return { disbanded: false };
  },
});

export const deleteGroup = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const clerkId = await requireClerkId(ctx);
    const group = await ctx.db.get(args.groupId);
    if (!group) return;
    if (group.ownerId !== clerkId)
      throw new ConvexError("Only the group owner can delete it.");
    await deleteGroupAndMembers(ctx, args.groupId);
  },
});

export const kickMember = mutation({
  args: { groupId: v.id("groups"), userId: v.string() },
  handler: async (ctx, args) => {
    const clerkId = await requireClerkId(ctx);
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new ConvexError("Group not found.");
    if (group.ownerId !== clerkId)
      throw new ConvexError("Only the group owner can remove members.");
    if (args.userId === clerkId)
      throw new ConvexError(
        "You can't remove yourself; delete the group instead."
      );
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.userId)
      )
      .unique();
    if (membership) await ctx.db.delete(membership._id);
  },
});

export const getMyGroups = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const clerkId = identity.subject;
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", clerkId))
      .collect();

    const groups = [];
    for (const m of memberships) {
      const group = await ctx.db.get(m.groupId);
      if (!group) continue;
      const members = await ctx.db
        .query("groupMembers")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();
      const cap = await capForOwner(ctx, group.ownerId);
      groups.push({
        _id: group._id,
        name: group.name,
        inviteCode: group.inviteCode,
        isOwner: group.ownerId === clerkId,
        memberCount: members.length,
        cap,
      });
    }
    return groups;
  },
});

export const getGroupDetail = query({
  args: { groupId: v.id("groups"), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const clerkId = identity.subject;

    const group = await ctx.db.get(args.groupId);
    if (!group) return null;

    // Only members may view a group's leaderboard.
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", clerkId)
      )
      .unique();
    if (!myMembership) return null;

    const memberRows = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
    const cap = await capForOwner(ctx, group.ownerId);

    const members = [];
    for (const m of memberRows) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", m.userId))
        .unique();
      const completion = await ctx.db
        .query("dailyCompletions")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", m.userId).eq("date", args.date)
        )
        .unique();
      const subs = await ctx.db
        .query("leetcodeSubmissions")
        .withIndex("by_userId", (q) => q.eq("userId", m.userId))
        .collect();
      members.push({
        userId: m.userId,
        name: user?.name ?? "User",
        imageUrl: user?.imageUrl ?? "",
        isOwner: group.ownerId === m.userId,
        todayCount: completion?.count ?? 0,
        totalSolved: subs.length,
      });
    }

    members.sort(
      (a, b) => b.todayCount - a.todayCount || b.totalSolved - a.totalSolved
    );

    return {
      _id: group._id,
      name: group.name,
      inviteCode: group.inviteCode,
      isOwner: group.ownerId === clerkId,
      cap,
      memberCount: members.length,
      members,
    };
  },
});
