"use client";

import { useUser, SignInButton } from "@clerk/nextjs";
import { Briefcase } from "lucide-react";
import JobBoardGrid from "@/components/JobBoardGrid";
import { Button } from "@/components/ui/button";

export default function JobsPage() {
  const { isLoaded, isSignedIn } = useUser();

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Briefcase className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Job Board</h1>
          <p className="text-muted-foreground">
            New-grad &amp; software engineer roles, auto-tracked across top
            companies.
          </p>
        </div>

        {!isLoaded ? (
          <p className="text-center text-muted-foreground">Loading…</p>
        ) : !isSignedIn ? (
          <div className="text-center rounded-lg border border-dashed p-10 max-w-md mx-auto">
            <p className="text-muted-foreground mb-4">
              Sign in to browse live job postings from Apple, Google, OpenAI,
              and more.
            </p>
            <SignInButton mode="modal">
              <Button className="rounded-full">Sign In to View Jobs</Button>
            </SignInButton>
          </div>
        ) : (
          <JobBoardGrid />
        )}
      </div>
    </div>
  );
}
