import { ConvexError, v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import stripe from "../src/util/stripe";

// A stored customer id can point at a Stripe account we no longer use
// (key rotation, test -> live switch). Verify it against the current
// account and re-create + persist it if missing, so pre-existing users
// can still check out.
async function ensureStripeCustomer(
  ctx: ActionCtx,
  user: {
    clerkId: string;
    email: string;
    name: string;
    stripeCustomerID: string;
  }
): Promise<string> {
  if (user.stripeCustomerID) {
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerID);
      if (!existing.deleted) {
        return user.stripeCustomerID;
      }
    } catch {
      // Unknown in this Stripe account — fall through and re-create.
    }
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      clerkId: user.clerkId,
    },
  });

  await ctx.runMutation(internal.user.setStripeCustomerId, {
    clerkId: user.clerkId,
    stripeCustomerID: customer.id,
  });

  return customer.id;
}

export const createOneTimeCheckoutSession = action({
  args: {
    priceId: v.string(),
    origin: v.optional(v.string()),
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

    const origin =
      args.origin ?? process.env.APP_URL ?? "http://localhost:3000";

    const customerId = await ensureStripeCustomer(ctx, user);

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: args.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: origin,
      cancel_url: origin,
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
  args: { priceId: v.string(), origin: v.optional(v.string()) },
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

    // Where to send the user back after Stripe. The client passes its own
    // origin; fall back to a configured app URL, then localhost for dev.
    const origin =
      args.origin ?? process.env.APP_URL ?? "http://localhost:3000";

    const customerId = await ensureStripeCustomer(ctx, user);

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: args.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/upgrade?success=1`,
      cancel_url: `${origin}/upgrade?canceled=1`,
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
  args: { origin: v.optional(v.string()) },
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

    const origin =
      args.origin ?? process.env.APP_URL ?? "http://localhost:3000";

    const customerId = await ensureStripeCustomer(ctx, user);

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/upgrade`,
    });
    if (!portal) {
      throw new ConvexError("Billing portal not found");
    }

    return { url: portal.url };
  },
});
