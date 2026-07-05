"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format } from "date-fns";
import { todayStr } from "@/lib/today";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Users } from "lucide-react";
import Link from "next/link";

const DEFAULT_DAILY_GOAL = 2;

export default function DailyLeaderboard() {
  const todayDate = todayStr();

  // Leaderboard scoped to the signed-in user: their group, or just them.
  const board = useQuery(api.groups.getDailyLeaderboard, {
    date: todayDate,
  });

  const dailyGoal = board?.dailyGoal ?? DEFAULT_DAILY_GOAL;

  // Helper to get initials for avatar fallback
  const getInitials = (name: string | undefined | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Sort users by completion count (descending)
  const sortedCompletions = board
    ? [...board.entries].sort((a, b) => b.count - a.count)
    : [];

  const subtitle =
    board?.scope === "group" ? (
      <span className="inline-flex items-center gap-1">
        <Users className="h-3.5 w-3.5" /> {board.groupName}
        {!board.canEditGoal && (
          <span className="text-muted-foreground/80">
            {" "}
            · goal set by the group owner
          </span>
        )}
      </span>
    ) : board?.scope === "self" ? (
      <>
        Just you —{" "}
        <Link href="/groups" className="text-primary hover:underline">
          join a group
        </Link>{" "}
        to compete with friends.
      </>
    ) : board?.scope === "signedOut" ? (
      "Sign in to track your grind."
    ) : null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          Today&apos;s Grind ({format(new Date(), "MMMM d")})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Goal: Complete {dailyGoal} LeetCode{" "}
          {dailyGoal === 1 ? "problem" : "problems"} today.
          {board?.canEditGoal && (
            <Link
              href="/groups"
              className="ml-1.5 text-primary hover:underline"
            >
              Change goal
            </Link>
          )}
        </p>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent>
        {board && sortedCompletions.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            {board.scope === "signedOut"
              ? "Sign in to see your group's grind."
              : "No submissions recorded for today yet."}
          </p>
        )}
        <ul className="space-y-4">
          {sortedCompletions.map((completion) => {
            const isGoalMet = completion.count >= dailyGoal;
            const progressValue = Math.min(
              (completion.count / dailyGoal) * 100,
              100
            );

            return (
              <li
                key={completion.userId}
                className="flex items-center gap-4 p-3 border rounded-md"
              >
                <Avatar className="h-10 w-10 border border-muted">
                  <AvatarImage
                    src={completion.userImage}
                    alt={completion.userName}
                  />
                  <AvatarFallback>
                    {getInitials(completion.userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">{completion.userName}</span>
                    <span
                      className={`text-sm font-semibold ${isGoalMet ? "text-green-600" : "text-orange-600"}`}
                    >
                      {completion.count} / {dailyGoal}
                    </span>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                </div>
                {isGoalMet ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-orange-500" />
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
