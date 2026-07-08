"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { SignInButton, useAuth } from "@clerk/nextjs";
import CustomProfile from "./CustomProfile";
import Link from "next/link";
import { ModeToggle } from "./ModeToggle";
import { useIsOwner } from "@/hooks/useIsOwner";

const Header = () => {
  const { isSignedIn } = useAuth();
  const isOwner = useIsOwner();

  return (
    <header className="py-6 px-6 md:px-12 w-full">
      <div className="container mx-auto flex justify-between items-center">
        <Link href={"/"} className="flex items-center gap-2">
          <div className="font-display font-semibold text-xl tracking-tight">
            LeetCode Tracker
          </div>
          <div className="text-xs bg-accent text-accent-foreground px-2.5 py-0.5 rounded-full font-medium">
            Grind
          </div>
        </Link>
        <div className="flex items-center justify-center gap-6">
          <nav className="hidden md:flex items-center gap-4 mr-4">
            <Link
              href="/"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Home
            </Link>
            {isSignedIn && (
              <Link
                href="/upload"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Sync LeetCode
              </Link>
            )}
            {isSignedIn && (
              <Link
                href="/groups"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Groups
              </Link>
            )}
            {isSignedIn && (
              <Link
                href="/jobs"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Jobs
              </Link>
            )}
            <Link
              href="/upgrade"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Upgrade
            </Link>
            {isOwner && (
              <Link
                href="/admin"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Admin
              </Link>
            )}
          </nav>

          <ModeToggle />

          {isSignedIn ? (
            <CustomProfile />
          ) : (
            <SignInButton mode="modal">
              <Button variant="default" className="rounded-full">
                Sign In to Track Progress
              </Button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
