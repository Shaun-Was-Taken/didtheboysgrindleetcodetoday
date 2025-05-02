"use client";

import { AuroraText } from "@/components/magicui/aurora-text";
import { Code, Upload } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { SparklesText } from "./magicui/sparkles-text";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import UserHeatmapCard from "./UserHeatmapCard";
import { Button } from "./ui/button";
import Link from "next/link";
import CountdownTimer from "./CountdownTimer";

const HeroSection = () => {
  const { user, isSignedIn } = useUser();

  // Query user info (not using directly but keeping for future use)
  useQuery(
    api.user.getUserInfo,
    isSignedIn && user?.id ? { clerkId: user.id } : "skip"
  );

  // Get all users from submissions
  const allUsers = useQuery(api.leetcode.getAllUsers) || [];
  return (
    <section className="py-10 md:py-16 lg:py-20 px-4 sm:px-6 md:px-12">
      <div className="container mx-auto max-w-6xl text-center animate-fade-in">
        <div className="flex justify-center mb-6">
          <Code className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 md:mb-6">
          Did The Boys{" "}
          <span className="inline-block">
            <SparklesText>Grind</SparklesText>
          </span>
          <br className="sm:hidden" />
          <br className="hidden sm:block" />
          <span className="text-primary">
            <AuroraText>LeetCode</AuroraText>
          </span>{" "}
          Today?
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-xs sm:max-w-lg md:max-w-2xl mx-auto mb-6 md:mb-10 px-2">
          Track your LeetCode grinding progress with our beautiful heatmap
          visualization. Submit your solutions and build your streak! 🔥
        </p>

        {/* Countdown Timer to May 19, 2025 */}
        <div className="mb-10">
          <CountdownTimer />
        </div>

        <div className="flex flex-col items-center gap-10">
          {isSignedIn && (
            <div className="w-full flex justify-end">
              <Button asChild className="gap-2">
                <Link href="/upload">
                  <Upload className="h-4 w-4" />
                  Upload Your Progress
                </Link>
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* Always show logged in user's heatmap, even if they have no submissions */}
            {isSignedIn && user?.id && (
              <UserHeatmapCard
                key={user.id}
                userId={user.id}
                userName={user.fullName || user.username}
                userImage={user.imageUrl}
              />
            )}

            {/* Show other users from submissions */}
            {allUsers && allUsers.length > 0
              ? // Filter out current user (we already added their card)
                allUsers
                  .filter((userId) => !isSignedIn || userId !== user?.id)
                  .map((userId) => (
                    <UserHeatmapCard key={userId} userId={userId} />
                  ))
              : !isSignedIn && (
                  <div className="col-span-2 text-center p-8 border border-dashed rounded-lg">
                    <p className="text-muted-foreground">
                      No submissions yet. Be the first to upload your LeetCode
                      progress!
                    </p>
                  </div>
                )}
          </div>
        </div>
      </div>
    </section>
  );
};
export default HeroSection;
