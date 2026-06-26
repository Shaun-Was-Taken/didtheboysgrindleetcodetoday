"use client";

import { AuroraText } from "@/components/magicui/aurora-text";
import { Code } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { SparklesText } from "./magicui/sparkles-text";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import UserHeatmapCard from "./UserHeatmapCard";
import DailyLeaderboard from "./DailyLeaderboard";
import StreakHero from "./StreakHero";

const HeroSection = () => {
  const { user, isSignedIn } = useUser();

  // Heatmaps scoped to the signed-in user's group (or just themselves).
  const allUsers = useQuery(api.groups.getMyCircleUserIds) || [];
  const others = allUsers.filter((id) => !isSignedIn || id !== user?.id);

  return (
    <section className="px-4 py-8 sm:px-6 md:px-12 md:py-12">
      <div className="container mx-auto max-w-5xl">
        {isSignedIn ? (
          <StreakHero />
        ) : (
          /* Signed-out marketing hero — the brand moment */
          <div className="animate-fade-in text-center">
            <div className="mb-6 flex justify-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-primary shadow-sm ring-1 ring-border">
                <Code className="h-8 w-8" />
              </span>
            </div>
            <h1 className="mb-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl md:mb-6 md:text-6xl">
              Did The Boys{" "}
              <span className="inline-block">
                <SparklesText colors={{ first: "#E3B873", second: "#9DB596" }}>
                  Grind
                </SparklesText>
              </span>
              <br />
              <span className="text-primary">
                <AuroraText colors={["#6E8B6A", "#E3B873", "#C68A5B", "#6E8B6A"]}>
                  LeetCode
                </AuroraText>
              </span>{" "}
              Today?
            </h1>
            <p className="mx-auto mb-2 max-w-2xl px-2 text-base text-muted-foreground sm:text-lg md:text-xl">
              A cozy corner for the crew to log a problem a day, watch the streak
              grow warm, and keep each other showing up.
            </p>
          </div>
        )}

        {/* Today's crew status */}
        <div className="mt-10">
          <DailyLeaderboard />
        </div>

        {/* Heatmaps — your own promoted as the centerpiece */}
        <div className="mt-10 space-y-6">
          {isSignedIn && user?.id && (
            <UserHeatmapCard
              key={user.id}
              userId={user.id}
              userName={user.fullName || user.username}
              userImage={user.imageUrl}
            />
          )}

          {others.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {others.map((userId) => (
                <UserHeatmapCard key={userId} userId={userId} />
              ))}
            </div>
          ) : (
            !isSignedIn && (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  No grind logged yet. Sign in to start your streak and bring the
                  boys along.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
