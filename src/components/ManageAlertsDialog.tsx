"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Bell, BellRing, Lock } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { usePremium } from "@/hooks/usePremium";
import { TRACKED_COMPANIES, companyLogoUrl } from "@/lib/companies";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Central place for Premium users to pick which companies email them when
 * new jobs drop. Uses the same jobAlerts subscriptions as the per-board
 * JobAlertBell, so toggles stay in sync everywhere.
 */
export default function ManageAlertsDialog() {
  const { isSignedIn, isPremium } = usePremium();
  const myAlerts = useQuery(
    api.jobAlerts.getMyAlerts,
    isSignedIn ? {} : "skip"
  );
  const toggle = useMutation(api.jobAlerts.toggleAlert);
  const [busyCompany, setBusyCompany] = useState<string | null>(null);

  if (!isSignedIn) return null;

  const subscribed = new Set(myAlerts ?? []);

  const handleToggle = async (company: string) => {
    setBusyCompany(company);
    try {
      await toggle({ company });
    } catch {
      // Premium re-check failures are rare; ignore and let the UI re-sync.
    } finally {
      setBusyCompany(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full gap-2">
          <Bell className="h-4 w-4" />
          Manage email alerts
          {isPremium && subscribed.size > 0 && (
            <Badge variant="secondary" className="text-xs">
              {subscribed.size}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Email alerts</DialogTitle>
          <DialogDescription>
            {isPremium
              ? "You get an email the moment any company posts a new role. Turn off the ones you don't care about."
              : "Job alerts are a Premium feature."}
          </DialogDescription>
        </DialogHeader>

        {!isPremium ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <Lock className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
            <p className="mb-4 text-sm text-muted-foreground">
              Upgrade to get instant emails when any of the{" "}
              {TRACKED_COMPANIES.length} tracked companies posts a new role —
              you choose which ones.
            </p>
            <Button asChild className="rounded-full">
              <Link href="/upgrade">Upgrade to Premium</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {TRACKED_COMPANIES.map(({ name, domain }) => {
              const on = subscribed.has(name);
              return (
                <li key={name} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={companyLogoUrl(domain)}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="flex-1 text-sm font-medium">{name}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={
                      on ? `Disable ${name} alerts` : `Enable ${name} alerts`
                    }
                    disabled={busyCompany === name}
                    onClick={() => handleToggle(name)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                      on
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {on ? (
                      <BellRing className="h-3.5 w-3.5" />
                    ) : (
                      <Bell className="h-3.5 w-3.5" />
                    )}
                    {on ? "On" : "Off"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
