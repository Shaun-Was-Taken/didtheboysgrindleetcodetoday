import { query, QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { isOwner } from "./access";
import { DEFAULT_DAILY_GOAL } from "./groups";

// Every query in this file is owner-only. The /admin page hides itself
// client-side, but the real gate is here: each handler resolves the caller's
// email via the users table (access.ts) before touching any data.
async function requireOwner(ctx: QueryCtx): Promise<void> {
  if (!(await isOwner(ctx))) throw new ConvexError("Not authorized.");
}

/** Shift a "YYYY-MM-DD" string by n calendar days (pure math, no timezone). */
function addDaysStr(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// Full-table collects below are fine at current scale (tens of users);
// revisit with indexed counters if tables grow past a few thousand rows.

export const overview = query({
  args: { today: v.string() },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const users = await ctx.db.query("users").collect();
    const groups = await ctx.db.query("groups").collect();
    const submissions = await ctx.db.query("leetcodeSubmissions").collect();
    const todayCompletions = await ctx.db
      .query("dailyCompletions")
      .withIndex("by_date", (q) => q.eq("date", args.today))
      .collect();

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      totalUsers: users.length,
      newUsersThisWeek: users.filter((u) => u._creationTime >= weekAgo).length,
      premiumUsers: users.filter(
        (u) => u.stripeSubscriptionStatus === "active"
      ).length,
      linkedLeetcode: users.filter((u) => u.leetcodeUsername).length,
      totalGroups: groups.length,
      totalSubmissions: submissions.length,
      submissionsToday: submissions.filter(
        (s) => s.submissionDate === args.today
      ).length,
      activeToday: todayCompletions.length,
      problemsToday: todayCompletions.reduce((sum, c) => sum + c.count, 0),
    };
  },
});

export const dailyActivity = query({
  args: { today: v.string(), days: v.number() },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const days = Math.min(Math.max(Math.floor(args.days), 1), 60);
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = addDaysStr(args.today, -i);
      const rows = await ctx.db
        .query("dailyCompletions")
        .withIndex("by_date", (q) => q.eq("date", date))
        .collect();
      series.push({
        date,
        activeUsers: rows.length,
        problems: rows.reduce((sum, r) => sum + r.count, 0),
      });
    }
    return series;
  },
});

export const allUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const users = await ctx.db.query("users").order("desc").collect();
    return Promise.all(
      users.map(async (u) => {
        const subs = await ctx.db
          .query("leetcodeSubmissions")
          .withIndex("by_userId", (q) => q.eq("userId", u.clerkId))
          .collect();
        const membership = await ctx.db
          .query("groupMembers")
          .withIndex("by_user", (q) => q.eq("userId", u.clerkId))
          .first();
        const group = membership
          ? await ctx.db.get(membership.groupId)
          : null;
        const lastSolveDate = subs.reduce<string | null>(
          (max, s) => (!max || s.submissionDate > max ? s.submissionDate : max),
          null
        );
        return {
          name: u.name,
          email: u.email,
          imageUrl: u.imageUrl,
          createdAt: u._creationTime,
          leetcodeUsername: u.leetcodeUsername ?? null,
          premium: u.stripeSubscriptionStatus === "active",
          totalSolves: subs.length,
          lastSolveDate,
          groupName: group?.name ?? null,
        };
      })
    );
  },
});

export const allGroups = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const groups = await ctx.db.query("groups").order("desc").collect();
    return Promise.all(
      groups.map(async (g) => {
        const members = await ctx.db
          .query("groupMembers")
          .withIndex("by_group", (q) => q.eq("groupId", g._id))
          .collect();
        const owner = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", g.ownerId))
          .unique();
        return {
          name: g.name,
          memberCount: members.length,
          ownerName: owner?.name ?? "unknown",
          ownerEmail: owner?.email ?? null,
          dailyGoal: g.dailyGoal ?? DEFAULT_DAILY_GOAL,
          createdAt: g.createdAt,
        };
      })
    );
  },
});

export const recentSubmissions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const limit = Math.min(args.limit ?? 25, 100);
    const subs = await ctx.db
      .query("leetcodeSubmissions")
      .order("desc")
      .take(limit);

    const userCache = new Map<string, { name: string; email: string }>();
    return Promise.all(
      subs.map(async (s) => {
        let who = userCache.get(s.userId);
        if (!who) {
          const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", s.userId))
            .unique();
          who = {
            name: user?.name ?? "unknown",
            email: user?.email ?? "",
          };
          userCache.set(s.userId, who);
        }
        return {
          problemTitle: s.problemTitle,
          difficulty: s.difficulty ?? null,
          submissionDate: s.submissionDate,
          source: s.source ?? "screenshot",
          userName: who.name,
          userEmail: who.email,
        };
      })
    );
  },
});
