import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { internal } from "./_generated/api";
import stripe from "../src/util/stripe";

const http = httpRouter();

const clerkWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;

  if (!webhookSecret) {
    return new Response("No webhook secret", { status: 400 });
  }

  const svix_id = request.headers.get("svix-id");
  const svix_timestamp = request.headers.get("svix-timestamp");
  const svix_signature = request.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await request.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(webhookSecret);

  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    return new Response("Error verifying webhook", { status: 400 });
  }

  const evenType = event.type;

  if (evenType == "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } =
      event.data;
    const email = email_addresses[0].email_address;
    const name = `${first_name} ${last_name}`;

    try {
      const customer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          clerkId: id,
        },
      });
      await ctx.runMutation(internal.user.createUser, {
        clerkId: id,
        email,
        name,
        imageUrl: image_url,
        stripeCustomerID: customer.id,
      });
    } catch (err) {
      return new Response("Error creating user", { status: 400 });
    }
  } else if (evenType == "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } =
      event.data;
    const email = email_addresses[0].email_address;
    const name = `${first_name} ${last_name}`;
    try {
      await ctx.runMutation(internal.user.updateUser, {
        clerkId: id,
        email,
        name,
        imageUrl: image_url,
      });
    } catch (err) {
      return new Response("Error updating user", { status: 400 });
    }
  }

  return new Response("Event received", { status: 200 });
});

const stripeWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Stripe webhook secret is not set", { status: 500 });
  }

  const payload = await request.text();
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret
    );
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
        const customer = event.data.object.customer as string;

        const user = await ctx.runQuery(
          internal.user.getUserByStripeCustomerId,
          {
            stripeCustomerId: customer,
          }
        );

        if (!user) {
          return new Response("User not found", { status: 404 });
        }

        await ctx.runMutation(internal.user.updateUserSubscription, {
          stripeCustomerId: customer,
          stripeSubscriptionStatus: "active",
          stripeSubscriptionId: event.data.object.id,
        });
        break;

      case "customer.subscription.deleted":
        const customerDeleted = event.data.object.customer as string;

        const userDeleted = await ctx.runQuery(
          internal.user.getUserByStripeCustomerId,
          {
            stripeCustomerId: customerDeleted,
          }
        );

        if (!userDeleted) {
          return new Response("User not found", { status: 404 });
        }

        await ctx.runMutation(internal.user.updateUserSubscription, {
          stripeCustomerId: customerDeleted,
          stripeSubscriptionStatus: "inactive",
          stripeSubscriptionId: event.data.object.id,
        });

        break;
      case "checkout.session.completed":
        const session = event.data.object;
        if (session.mode === "payment") {
          //add credit to user
          const customerId = session.customer as string;
          const user = await ctx.runQuery(
            internal.user.getUserByStripeCustomerId,
            {
              stripeCustomerId: customerId,
            }
          );
          if (!user) {
            return new Response("User not found", { status: 404 });
          }
          await ctx.runMutation(internal.user.addCredit, {
            stripeCustomerId: customerId,
            credit: 5000,
          });
        }

        break;
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (err) {
    return new Response("Webhook handler failed", { status: 500 });
  }
});

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: clerkWebhook,
});

http.route({
  path: "/stripe",
  method: "POST",
  handler: stripeWebhook,
});

export default http;
