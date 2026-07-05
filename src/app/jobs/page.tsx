"use client";

import { useUser, SignInButton } from "@clerk/nextjs";
import JobBoardGrid from "@/components/JobBoardGrid";
import ManageAlertsDialog from "@/components/ManageAlertsDialog";
import { Button } from "@/components/ui/button";

export default function JobsPage() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-10 border-b border-border pb-8">
          <p className="inline-flex items-center gap-2 font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground">
            <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
            THE BOARD · REFRESHED HOURLY
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div className="max-w-xl">
              <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                Where the boys are applying
              </h1>
              <p className="mt-3 text-muted-foreground">
                New-grad &amp; software engineer roles, auto-tracked straight
                off the careers pages. Anything marked{" "}
                <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-primary">
                  FRESH
                </span>{" "}
                landed in the last two days.
              </p>
            </div>
            {isSignedIn && <ManageAlertsDialog />}
          </div>
        </div>

        {!isLoaded ? (
          <p className="text-center text-muted-foreground">Loading…</p>
        ) : !isSignedIn ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed p-10 text-center">
            <p className="mb-4 text-muted-foreground">
              Sign in to browse live postings from Apple, Google, OpenAI, and a
              dozen more — refreshed around the clock.
            </p>
            <SignInButton mode="modal">
              <Button className="rounded-full">Sign in to view jobs</Button>
            </SignInButton>
          </div>
        ) : (
          <JobBoardGrid />
        )}
      </div>
    </div>
  );
}
