"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle } from "lucide-react";

const DAILY_GOAL = 2;

export default function DailyLeaderboard() {
  const todayDate = format(new Date(), "yyyy-MM-dd");

  // Fetch daily completions for today
  const dailyCompletions = useQuery(api.leetcode.getDailyCompletions, {
    date: todayDate,
  });

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
  const sortedCompletions = dailyCompletions
    ? [...dailyCompletions].sort((a, b) => b.count - a.count)
    : [];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          Today&apos;s Grind ({format(new Date(), "MMMM d")})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Goal: Complete {DAILY_GOAL} LeetCode problems today.
        </p>
      </CardHeader>
      <CardContent>
        {sortedCompletions.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No submissions recorded for today yet.
          </p>
        )}
        <ul className="space-y-4">
          {sortedCompletions.map((completion) => {
            const isGoalMet = completion.count >= DAILY_GOAL;
            const progressValue = Math.min(
              (completion.count / DAILY_GOAL) * 100,
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
                      {completion.count} / {DAILY_GOAL}
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
