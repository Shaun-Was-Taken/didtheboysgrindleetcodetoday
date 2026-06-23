"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { Crown, Check, X, CreditCard } from "lucide-react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import PricingCard from "@/components/PricingCard";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/usePremium";

export default function UpgradePage() {
  const { isSignedIn } = useUser();
  const { isPremium, isLoading } = usePremium();

  const createCheckout = useAction(api.stripe.createSubcriptionCheckoutSession);
  const billingPortal = useAction(api.stripe.billingPortal);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<"success" | "canceled" | null>(null);

  // Read the Stripe redirect result without pulling in useSearchParams
  // (which would force a Suspense boundary on this page).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) setBanner("success");
    else if (params.get("canceled")) setBanner("canceled");
  }, []);

  const handleUpgrade = async () => {
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID;
    if (!priceId) {
      setError(
        "Premium isn't configured yet. Set NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID."
      );
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { url } = await createCheckout({
        priceId,
        origin: window.location.origin,
      });
      window.location.href = url;
    } catch {
      setError("Could not start checkout. Please try again.");
      setBusy(false);
    }
  };

  const handleBilling = async () => {
    setBusy(true);
    try {
      const { url } = await billingPortal();
      window.location.href = url;
    } catch {
      setError("Could not open the billing portal. Please try again.");
      setBusy(false);
    }
  };

  const freeFeatures = [
    { text: "Friend groups up to 3 members" },
    { text: "Daily LeetCode heatmaps & leaderboard" },
    { text: "Browse the job board" },
  ];

  const premiumFeatures = [
    { text: "Friend groups up to 15 members" },
    { text: "Email alerts when new jobs are posted" },
    { text: "Everything in Free" },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Crown className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Upgrade to Premium
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Bigger friend groups and instant email alerts when roles drop at top
            companies — for $4.99/month.
          </p>
        </div>

        {banner === "success" && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            <Check className="h-4 w-4 shrink-0" />
            Payment received! Your Premium perks unlock as soon as Stripe
            confirms the subscription (usually a few seconds).
          </div>
        )}
        {banner === "canceled" && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
            <X className="h-4 w-4 shrink-0" />
            Checkout canceled — no charge was made. You can upgrade anytime.
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <X className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!isSignedIn ? (
          <div className="text-center rounded-lg border border-dashed p-10">
            <p className="text-muted-foreground mb-4">
              Sign in to manage your plan and upgrade to Premium.
            </p>
            <SignInButton mode="modal">
              <Button className="rounded-full">Sign In</Button>
            </SignInButton>
          </div>
        ) : isPremium ? (
          <div className="text-center rounded-lg border border-primary/40 bg-primary/5 p-10">
            <Crown className="mx-auto h-8 w-8 text-primary mb-3" />
            <h2 className="text-xl font-semibold mb-1">You&apos;re Premium ✓</h2>
            <p className="text-muted-foreground mb-6">
              Groups up to 15 members and job email alerts are unlocked.
            </p>
            <Button onClick={handleBilling} disabled={busy} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Manage Billing
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            <PricingCard
              title="Free"
              price="$0"
              description="Everything you need to start grinding with friends."
              features={freeFeatures}
              buttonText="Current Plan"
              isLoading
            />
            <PricingCard
              title="Premium"
              price="$4.99"
              description="For bigger crews and serious job hunters."
              features={premiumFeatures}
              buttonText={busy ? "Redirecting…" : "Upgrade to Premium"}
              isSubscription
              isLoading={busy || isLoading}
              onButtonClick={handleUpgrade}
              className="border-primary"
            />
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
