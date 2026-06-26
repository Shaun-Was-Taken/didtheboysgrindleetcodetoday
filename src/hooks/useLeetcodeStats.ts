"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { todayStr, addDaysStr } from "@/lib/today";

export type LeetcodeStats = {
  totalSolved: number;
  currentStreak: number;
  longestStreak: number;
  solvedToday: boolean;
  difficultyCounts: { Easy: number; Medium: number; Hard: number };
};

/**
 * Derives streak / total / difficulty stats for the signed-in user from their
 * raw submissions. The streak math used to live inline in ProgressStats; it's
 * pulled out here so the hero and any other surface can share one source of truth.
 *
 * Returns `loading` while the query is in flight and `stats: null` until there's
 * data to compute from.
 */
export function useLeetcodeStats(): {
  stats: LeetcodeStats | null;
  loading: boolean;
} {
  const { user, isSignedIn } = useUser();

  const submissions = useQuery(
    api.leetcode.getSubmissionsByUser,
    isSignedIn && user?.id ? { userId: user.id } : "skip"
  );

  const stats = useMemo<LeetcodeStats | null>(() => {
    if (!submissions || submissions.length === 0) return null;

    const totalSolved = submissions.length;

    // Distinct solve days, as canonical (Central) "YYYY-MM-DD" strings.
    const dateSet = new Set(submissions.map((s) => s.submissionDate));

    const today = todayStr();
    const solvedToday = dateSet.has(today);

    // Current streak — count back from today, or yesterday if today isn't done
    // yet but the streak is still alive.
    let currentStreak = 0;
    let cursor: string | null = solvedToday
      ? today
      : dateSet.has(addDaysStr(today, -1))
        ? addDaysStr(today, -1)
        : null;
    while (cursor && dateSet.has(cursor)) {
      currentStreak += 1;
      cursor = addDaysStr(cursor, -1);
    }

    // Longest streak — walk the ascending dates, counting consecutive days.
    let longestStreak = 0;
    let run = 0;
    let prev: string | null = null;
    for (const dateStr of [...dateSet].sort()) {
      run = prev && addDaysStr(prev, 1) === dateStr ? run + 1 : 1;
      if (run > longestStreak) longestStreak = run;
      prev = dateStr;
    }

    const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };
    for (const sub of submissions) {
      if (sub.difficulty && sub.difficulty in difficultyCounts) {
        difficultyCounts[sub.difficulty as keyof typeof difficultyCounts] += 1;
      }
    }

    return {
      totalSolved,
      currentStreak,
      longestStreak,
      solvedToday,
      difficultyCounts,
    };
  }, [submissions]);

  return { stats, loading: submissions === undefined };
}
