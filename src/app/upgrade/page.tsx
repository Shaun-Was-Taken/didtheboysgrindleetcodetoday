"use client";

import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { Crown, Check, X, CreditCard, ShieldCheck, Zap } from "lucide-react";
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
    { text: "Daily heatmaps, streaks & leaderboard" },
    { text: "Browse the full job board" },
  ];

  const premiumFeatures = [
    { text: "Friend groups up to 15 members", highlight: true },
    { text: "Email alerts the moment a job drops", highlight: true },
    { text: "Daily heatmaps, streaks & leaderboard" },
    { text: "Browse the full job board" },
  ];

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="container mx-auto max-w-4xl">
        {/* Hero — benefit-led */}
        <div className="mb-10 text-center">
          <p className="inline-flex items-center gap-2 font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground">
            <Crown className="h-3.5 w-3.5 text-primary" />
            PREMIUM
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Fit the whole crew.
            <br className="hidden sm:block" /> Catch every drop.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Grow your group to 15 and get an email the second a new role posts at
            the companies you follow — for $4.99 a month, about the price of a
            coffee.
          </p>
        </div>

        {banner === "success" && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
            <Check className="h-4 w-4 shrink-0" />
            Payment received! Your Premium perks unlock as soon as Stripe
            confirms the subscription (usually a few seconds).
          </div>
        )}
        {banner === "canceled" && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
            <X className="h-4 w-4 shrink-0" />
            Checkout canceled — no charge was made. You can upgrade anytime.
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <X className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!isSignedIn ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed p-10 text-center">
            <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary shadow-sm ring-1 ring-border">
              <Crown className="h-7 w-7" />
            </span>
            <p className="mb-4 text-muted-foreground">
              Sign in to manage your plan and unlock Premium.
            </p>
            <SignInButton mode="modal">
              <Button className="rounded-full">Sign in</Button>
            </SignInButton>
          </div>
        ) : isPremium ? (
          <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-primary/40 bg-card p-10 text-center shadow-sm">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/40 blur-3xl"
            />
            <div className="relative">
              <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary shadow-sm ring-1 ring-border">
                <Crown className="h-7 w-7" />
              </span>
              <h2 className="font-display text-2xl font-semibold">
                You&apos;re Premium
              </h2>
              <p className="mx-auto mt-1 mb-6 max-w-xs text-muted-foreground">
                Groups up to 15 and instant job alerts are all yours. Thanks for
                keeping the boys grinding.
              </p>
              <Button onClick={handleBilling} disabled={busy} className="gap-2">
                <CreditCard className="h-4 w-4" />
                Manage billing
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mx-auto grid max-w-3xl items-stretch gap-6 md:grid-cols-2">
              <PricingCard
                title="Free"
                price="$0"
                description="Everything you need to start grinding with friends."
                features={freeFeatures}
                buttonText="Your current plan"
                buttonVariant="outline"
                isLoading
              />
              <PricingCard
                title="Premium"
                price="$4.99"
                period="/month"
                description="For bigger crews and serious job hunters."
                features={premiumFeatures}
                buttonText={busy ? "Redirecting…" : "Upgrade for $4.99/mo"}
                onButtonClick={handleUpgrade}
                isLoading={busy || isLoading}
                recommended
                badge="Most popular"
                microcopy="Cancel anytime · Secured by Stripe"
              />
            </div>

            {/* Trust row */}
            <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Secure checkout via Stripe
              </span>
              <span className="inline-flex items-center gap-2">
                <X className="h-4 w-4 text-primary" />
                Cancel in one click
              </span>
              <span className="inline-flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Perks unlock instantly
              </span>
            </div>

            {/* FAQ — objection handling */}
            <div className="mx-auto mt-14 max-w-2xl">
              <h2 className="mb-6 text-center font-display text-2xl font-semibold">
                Questions, answered
              </h2>
              <div className="space-y-3">
                {[
                  {
                    q: "What happens to my group when I upgrade?",
                    a: "It jumps from 3 to 15 seats instantly — nobody has to rejoin, and your invite code stays the same.",
                  },
                  {
                    q: "Can I cancel anytime?",
                    a: "Yes. Manage or cancel in one click from the billing portal. You keep Premium until the end of the period you paid for.",
                  },
                  {
                    q: "How do job alerts work?",
                    a: "We email you the moment a new role is posted at any company you follow on the job board — no refreshing required.",
                  },
                ].map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border bg-card px-5 py-4"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                      {item.q}
                      <span className="ml-4 text-muted-foreground transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
