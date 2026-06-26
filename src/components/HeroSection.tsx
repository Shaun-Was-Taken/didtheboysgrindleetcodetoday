"use client";

import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import UserHeatmapCard from "./UserHeatmapCard";
import DailyLeaderboard from "./DailyLeaderboard";
import StreakHero from "./StreakHero";
import LandingPage from "./LandingPage";

const HeroSection = () => {
  const { user, isSignedIn } = useUser();
  // Heatmaps scoped to the signed-in user's group (skipped when signed out).
  const allUsers =
    useQuery(api.groups.getMyCircleUserIds, isSignedIn ? {} : "skip") || [];

  // Signed-out visitors get the marketing landing — never the empty live
  // dashboard, which would just show "sign in" placeholders.
  if (!isSignedIn) {
    return <LandingPage />;
  }

  const others = allUsers.filter((id) => id !== user?.id);

  return (
    <section className="px-4 py-8 sm:px-6 md:px-12 md:py-12">
      <div className="container mx-auto max-w-5xl">
        <StreakHero />

        {/* Today's crew status */}
        <div className="mt-10">
          <DailyLeaderboard />
        </div>

        {/* Heatmaps — your own promoted as the centerpiece */}
        <div className="mt-10 space-y-6">
          {user?.id && (
            <UserHeatmapCard
              key={user.id}
              userId={user.id}
              userName={user.fullName || user.username}
              userImage={user.imageUrl}
            />
          )}

          {others.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {others.map((userId) => (
                <UserHeatmapCard key={userId} userId={userId} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
