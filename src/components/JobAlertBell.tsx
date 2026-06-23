"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { Bell, BellRing, Lock } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { usePremium } from "@/hooks/usePremium";

/**
 * Per-company email-alert toggle shown in a JobBoard header.
 *
 * - Signed out: hidden.
 * - Premium: toggles a subscription (filled bell when on).
 * - Free: a locked bell that links to /upgrade rather than erroring.
 */
export default function JobAlertBell({ company }: { company: string }) {
  const { isSignedIn, isPremium } = usePremium();
  const myAlerts = useQuery(
    api.jobAlerts.getMyAlerts,
    isSignedIn ? {} : "skip"
  );
  const toggle = useMutation(api.jobAlerts.toggleAlert);
  const [busy, setBusy] = useState(false);

  if (!isSignedIn) return null;

  if (!isPremium) {
    return (
      <Link
        href="/upgrade"
        title="Premium: get email alerts when new jobs are posted"
        aria-label="Upgrade to get job alerts"
        className="relative rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        <Lock className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-background p-[1px]" />
      </Link>
    );
  }

  const subscribed = (myAlerts ?? []).includes(company);

  const handleToggle = async () => {
    setBusy(true);
    try {
      await toggle({ company });
    } catch {
      // Premium re-check failures are rare; ignore and let the UI re-sync.
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={busy}
      aria-pressed={subscribed}
      title={
        subscribed
          ? `Stop email alerts for ${company}`
          : `Email me when ${company} posts new jobs`
      }
      aria-label={
        subscribed ? `Disable ${company} alerts` : `Enable ${company} alerts`
      }
      className={`rounded-md p-1 transition-colors hover:bg-muted disabled:opacity-50 ${
        subscribed
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {subscribed ? (
        <BellRing className="h-5 w-5" />
      ) : (
        <Bell className="h-5 w-5" />
      )}
    </button>
  );
}
