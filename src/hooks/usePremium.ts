"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Reads the signed-in user's subscription status from Convex and exposes a
 * simple `isPremium` flag. Premium === an active Stripe subscription.
 *
 * `isLoading` is true until both Clerk and the Convex query have resolved, so
 * callers can avoid flashing the free/upsell state for paying users.
 */
export function usePremium() {
  const { user, isLoaded, isSignedIn } = useUser();

  const info = useQuery(
    api.user.getUserInfo,
    isSignedIn && user?.id ? { clerkId: user.id } : "skip"
  );

  const isLoading = !isLoaded || (isSignedIn ? info === undefined : false);
  const isPremium = info?.stripeSubscriptionStatus === "active";

  return {
    isPremium,
    isLoading,
    isSignedIn: Boolean(isSignedIn),
    credit: info?.credit ?? 0,
  };
}
