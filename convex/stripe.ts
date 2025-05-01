import { ConvexError, v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import stripe from "../src/util/stripe";

export const createOneTimeCheckoutSession = action({
  args: {
    priceId: v.string(),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const user = await ctx.runQuery(internal.user.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user) {
      throw new ConvexError("User not found");
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerID,
      line_items: [
        {
          price: args.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:3000",
      cancel_url: "http://localhost:3000",
      payment_method_types: ["card"],
      metadata: {
        userId: user._id,
        clerkId: user.clerkId,
      },
    });

    if (!checkoutSession.url) {
      throw new ConvexError("Checkout session not found");
    }

    return { url: checkoutSession.url };
  },
});

export const createSubcriptionCheckoutSession = action({
  args: { priceId: v.string() },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const user = await ctx.runQuery(internal.user.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user) {
      throw new ConvexError("User not found");
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerID,
      line_items: [
        {
          price: args.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: "http://localhost:3000",
      cancel_url: "http://localhost:3000",
      payment_method_types: ["card"],
      metadata: {
        userId: user._id,
        clerkId: user.clerkId,
      },
    });

    if (!checkoutSession.url) {
      throw new ConvexError("Checkout session not found");
    }

    return { url: checkoutSession.url };
  },
});

export const billingPortal = action({
  args: {},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }
    const user = await ctx.runQuery(internal.user.getUserByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) {
      throw new ConvexError("User not found");
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerID,
      return_url: "http://localhost:3000",
    });
    if (!portal) {
      throw new ConvexError("Billing portal not found");
    }

    return { url: portal.url };
  },
});
