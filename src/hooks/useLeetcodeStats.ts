"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { parseISO, format, isToday, differenceInDays } from "date-fns";

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

    const uniqueDates = Array.from(
      new Set(submissions.map((s) => s.submissionDate))
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const solvedToday = uniqueDates.some((d) => isToday(parseISO(d)));

    // Current streak — count back from today (or yesterday, if today's not done
    // yet but the streak is still alive).
    let currentStreak = 0;
    const anchor = solvedToday
      ? new Date()
      : uniqueDates.length > 0 &&
          differenceInDays(new Date(), parseISO(uniqueDates[0])) === 1
        ? parseISO(uniqueDates[0])
        : null;

    if (anchor) {
      currentStreak = 1;
      let checkDate = anchor;
      for (let i = 1; i < uniqueDates.length; i++) {
        checkDate = new Date(checkDate);
        checkDate.setDate(checkDate.getDate() - 1);
        if (uniqueDates.includes(format(checkDate, "yyyy-MM-dd"))) {
          currentStreak += 1;
        } else {
          break;
        }
      }
    }

    // Longest streak — walk forward through the ascending dates.
    let longestStreak = 0;
    let run = 0;
    let prev: Date | null = null;
    for (const dateStr of [...uniqueDates].reverse()) {
      const date = parseISO(dateStr);
      run = prev && differenceInDays(date, prev) === 1 ? run + 1 : 1;
      if (run > longestStreak) longestStreak = run;
      prev = date;
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
