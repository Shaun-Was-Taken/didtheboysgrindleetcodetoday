import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";

export const createUser = internalMutation({
  args: {
    email: v.string(),
    clerkId: v.string(),
    name: v.string(),
    imageUrl: v.string(),
    stripeCustomerID: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (user) {
      throw new Error("User already exists");
    }

    await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      stripeCustomerID: args.stripeCustomerID,
      stripeSubscriptionID: "",
      credit: 0,
      stripeSubscriptionStatus: "inactive",
    });
  },
});

//qury for getuserbyclerkid
export const getUserByClerkId = internalQuery({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  },
});

export const updateUser = internalMutation({
  args: {
    email: v.string(),
    clerkId: v.string(),
    name: v.string(),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
    });
  },
});

export const getUserByStripeCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerID", args.stripeCustomerId)
      )
      .unique();
  },
});

export const addCredit = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    credit: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerID", args.stripeCustomerId)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const updatedCredit = (user.credit || 0) + args.credit;

    // Update the user's credit in the database
    await ctx.db.patch(user._id, {
      credit: updatedCredit,
    });
  },
});

export const updateUserSubscription = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionStatus: v.string(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerID", args.stripeCustomerId)
      )
      .unique();
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(user._id, {
      stripeSubscriptionStatus: args.stripeSubscriptionStatus,
      stripeSubscriptionID: args.stripeSubscriptionId,
    });
  },
});

export const getUserInfo = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      // Return default values instead of throwing an error
      return {
        credit: 0,
        stripeSubscriptionStatus: "inactive",
      };
    }

    //return user credit, and the subscription status
    return {
      credit: user.credit,
      stripeSubscriptionStatus: user.stripeSubscriptionStatus,
    };
  },
});

export const getUserProfile = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.userId))
      .unique();

    if (!user) {
      // Return a default profile if user not found
      return {
        name: "User",
        imageUrl: "", // Empty string for default avatar fallback
      };
    }

    return {
      name: user.name,
      imageUrl: user.imageUrl,
    };
  },
});
