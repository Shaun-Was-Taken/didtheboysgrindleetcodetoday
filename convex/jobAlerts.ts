import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { TRACKED_COMPANY_NAMES } from "./companies";

/**
 * Job alerts are DEFAULT-ON for Premium users: an active subscriber gets an
 * email for every tracked company unless they mute it. A row in `jobAlerts`
 * therefore means "muted" — no rows means all alerts on. This also makes
 * newly added companies alert everyone automatically.
 */

/**
 * Toggle a Premium user's email alert for a company. Throws for non-Premium
 * users so the UI can show an upsell.
 */
export const toggleAlert = mutation({
  args: { company: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("You must be signed in.");
    const clerkId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) throw new ConvexError("User not found.");
    if (user.stripeSubscriptionStatus !== "active") {
      throw new ConvexError(
        "Job alert notifications are a Premium feature. Upgrade to get instant emails when new roles drop."
      );
    }

    const muted = await ctx.db
      .query("jobAlerts")
      .withIndex("by_user_company", (q) =>
        q.eq("userId", clerkId).eq("company", args.company)
      )
      .unique();
    if (muted) {
      await ctx.db.delete(muted._id);
      return { subscribed: true };
    }
    await ctx.db.insert("jobAlerts", {
      userId: clerkId,
      company: args.company,
      email: user.email,
    });
    return { subscribed: false };
  },
});

/** Companies the current user has alerts ON for (all tracked minus muted). */
export const getMyAlerts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const mutedRows = await ctx.db
      .query("jobAlerts")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    const muted = new Set(mutedRows.map((r) => r.company));
    return TRACKED_COMPANY_NAMES.filter((c) => !muted.has(c));
  },
});

/**
 * Emails of active Premium users who haven't muted this company. Premium is
 * checked here so lapsed subscribers stop receiving alerts automatically.
 */
export const getSubscribersForCompany = internalQuery({
  args: { company: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const emails: string[] = [];
    for (const user of users) {
      if (user.stripeSubscriptionStatus !== "active") continue;
      const muted = await ctx.db
        .query("jobAlerts")
        .withIndex("by_user_company", (q) =>
          q.eq("userId", user.clerkId).eq("company", args.company)
        )
        .unique();
      if (!muted) emails.push(user.email);
    }
    return emails;
  },
});

/**
 * One-off migration helper for the opt-in → default-on flip: the old schema's
 * rows meant "subscribed", which under the new semantics would read as
 * "muted". Run once after deploying to clear them:
 *   npx convex run jobAlerts:devClearAllAlerts
 */
export const devClearAllAlerts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("jobAlerts").collect();
    for (const row of rows) await ctx.db.delete(row._id);
    return { deleted: rows.length };
  },
});
