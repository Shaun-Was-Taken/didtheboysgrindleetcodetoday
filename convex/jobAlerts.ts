import { mutation, query, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";

/**
 * Toggle a Premium user's email alert subscription for a company's new
 * postings. Throws for non-Premium users so the UI can show an upsell.
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

    const existing = await ctx.db
      .query("jobAlerts")
      .withIndex("by_user_company", (q) =>
        q.eq("userId", clerkId).eq("company", args.company)
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { subscribed: false };
    }
    await ctx.db.insert("jobAlerts", {
      userId: clerkId,
      company: args.company,
      email: user.email,
    });
    return { subscribed: true };
  },
});

export const getMyAlerts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const rows = await ctx.db
      .query("jobAlerts")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
    return rows.map((r) => r.company);
  },
});

/**
 * Emails of users subscribed to a company's alerts who currently have an
 * active Premium subscription. Premium is re-checked here so lapsed
 * subscribers stop receiving alerts without needing their rows cleaned up.
 */
export const getSubscribersForCompany = internalQuery({
  args: { company: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("jobAlerts")
      .withIndex("by_company", (q) => q.eq("company", args.company))
      .collect();
    const emails: string[] = [];
    for (const r of rows) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", r.userId))
        .unique();
      if (user?.stripeSubscriptionStatus === "active") emails.push(r.email);
    }
    return emails;
  },
});
