"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { SignInButton, useAuth } from "@clerk/nextjs";
import CustomProfile from "./CustomProfile";
import Link from "next/link";
import { ModeToggle } from "./ModeToggle";

const Header = () => {
  const { isSignedIn } = useAuth();

  return (
    <header className="py-6 px-6 md:px-12 w-full">
      <div className="container mx-auto flex justify-between items-center">
        <Link href={"/"} className="flex items-center gap-2">
          <div className="font-bold text-xl">LeetCode Tracker</div>
          <div className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">
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
                Upload Progress
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
