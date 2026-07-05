"use client";

import { useUser, SignInButton } from "@clerk/nextjs";
import { Briefcase } from "lucide-react";
import JobBoardGrid from "@/components/JobBoardGrid";
import ManageAlertsDialog from "@/components/ManageAlertsDialog";
import { Button } from "@/components/ui/button";

export default function JobsPage() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <div className="mb-5 flex justify-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-primary shadow-sm ring-1 ring-border">
              <Briefcase className="h-7 w-7" />
            </span>
          </div>
          <p className="inline-flex items-center gap-2 font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            LIVE · REFRESHED EVERY HOUR
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Where the boys are applying
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            New-grad &amp; software engineer roles, auto-tracked across 15 top
            companies — so you never miss a fresh posting.
          </p>
          {isSignedIn && (
            <div className="mt-5 flex justify-center">
              <ManageAlertsDialog />
            </div>
          )}
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
