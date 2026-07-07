import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Clerk dev -> production instance migration (see
 * implementation_plan/clerk-production-migration.md).
 *
 * Users re-sign-in on the prod Clerk instance and get NEW clerkIds; the
 * signup webhook creates a second `users` row with the same email. These
 * helpers merge each such pair: the new row inherits the old row's Stripe
 * subscription and LeetCode sync state, every table referencing the old
 * clerkId is rewritten to the new one, and the old row is deleted.
 *
 * Idempotent: emails with a single row are untouched, so this can be run
 * repeatedly as stragglers sign in.
 *
 * Usage (after cutover):
 *   npx convex run --prod clerkMigration:remapAll
 */

/** Emails that currently have exactly two user rows (old + re-signed-in). */
export const listCandidates = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const byEmail = new Map<string, number>();
    for (const u of users) {
      const key = u.email.toLowerCase();
      byEmail.set(key, (byEmail.get(key) ?? 0) + 1);
    }
    return [...byEmail.entries()]
      .filter(([, n]) => n === 2)
      .map(([email]) => email);
  },
});

/** Merge one old/new user pair, matched by email. */
export const remapOneByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const rows = (await ctx.db.query("users").collect()).filter(
      (u) => u.email.toLowerCase() === args.email.toLowerCase()
    );
    if (rows.length !== 2) {
      return { email: args.email, skipped: `expected 2 rows, found ${rows.length}` };
    }

    // The re-signed-in identity is the newer row.
    rows.sort((a, b) => a._creationTime - b._creationTime);
    const [oldUser, newUser] = rows;
    if (oldUser.clerkId === newUser.clerkId) {
      return { email: args.email, skipped: "rows share a clerkId" };
    }

    // The new row inherits billing + sync state. Its auto-created (empty)
    // Stripe customer is abandoned in Stripe — harmless.
    await ctx.db.patch(newUser._id, {
      stripeCustomerID: oldUser.stripeCustomerID,
      stripeSubscriptionID: oldUser.stripeSubscriptionID,
      stripeSubscriptionStatus: oldUser.stripeSubscriptionStatus,
      credit: oldUser.credit,
      leetcodeUsername: oldUser.leetcodeUsername,
      leetcodeVerified: oldUser.leetcodeVerified,
      lastLeetcodeSyncAt: oldUser.lastLeetcodeSyncAt,
      dailyGoal: oldUser.dailyGoal,
    });

    const from = oldUser.clerkId;
    const to = newUser.clerkId;
    let rewritten = 0;

    const submissions = await ctx.db
      .query("leetcodeSubmissions")
      .withIndex("by_userId", (q) => q.eq("userId", from))
      .collect();
    for (const doc of submissions) {
      await ctx.db.patch(doc._id, { userId: to });
      rewritten++;
    }

    const completions = await ctx.db
      .query("dailyCompletions")
      .withIndex("by_user_date", (q) => q.eq("userId", from))
      .collect();
    for (const doc of completions) {
      await ctx.db.patch(doc._id, { userId: to });
      rewritten++;
    }

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", from))
      .collect();
    for (const doc of memberships) {
      await ctx.db.patch(doc._id, { userId: to });
      rewritten++;
    }

    const mutes = await ctx.db
      .query("jobAlerts")
      .withIndex("by_user", (q) => q.eq("userId", from))
      .collect();
    for (const doc of mutes) {
      await ctx.db.patch(doc._id, { userId: to });
      rewritten++;
    }

    const ownedGroups = await ctx.db
      .query("groups")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", from))
      .collect();
    for (const doc of ownedGroups) {
      await ctx.db.patch(doc._id, { ownerId: to });
      rewritten++;
    }

    await ctx.db.delete(oldUser._id);

    return { email: args.email, oldClerkId: from, newClerkId: to, rewritten };
  },
});

type RemapResult = {
  email: string;
  skipped?: string;
  oldClerkId?: string;
  newClerkId?: string;
  rewritten?: number;
};

/** Merge every old/new pair found. Safe to re-run any time. */
export const remapAll = internalAction({
  args: {},
  handler: async (ctx): Promise<RemapResult[]> => {
    const emails: string[] = await ctx.runQuery(
      internal.clerkMigration.listCandidates,
      {}
    );
    const results: RemapResult[] = [];
    for (const email of emails) {
      results.push(
        await ctx.runMutation(internal.clerkMigration.remapOneByEmail, {
          email,
        })
      );
    }
    console.log(`Clerk remap: processed ${results.length} pair(s).`);
    return results;
  },
});
