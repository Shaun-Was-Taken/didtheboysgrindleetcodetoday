"use client";

import { useUser } from "@clerk/clerk-react";
import { format } from "date-fns";
import Link from "next/link";
import { Flame, Code, Trophy, Upload, Brain } from "lucide-react";
import { useLeetcodeStats } from "@/hooks/useLeetcodeStats";
import { Button } from "./ui/button";

/**
 * The signed-in hero. Instead of a static title, it answers the app's own
 * question — "Did the boys grind today?" — with the user's live streak state,
 * and makes that streak the one bold focal moment ("the hearth").
 */
export default function StreakHero() {
  const { user } = useUser();
  const { stats, loading } = useLeetcodeStats();

  const firstName = user?.firstName || user?.username || "you";
  const eyebrow = format(new Date(), "EEEE · MMMM d").toUpperCase();

  // The verdict line — the page answering its own headline.
  let answer: string;
  if (loading) {
    answer = "Warming up…";
  } else if (!stats) {
    answer = `One problem is all it takes, ${firstName}.`;
  } else if (stats.solvedToday) {
    answer =
      stats.currentStreak > 1
        ? `Yes — ${stats.currentStreak} days and counting.`
        : "Yes. The streak starts today.";
  } else if (stats.currentStreak > 0) {
    answer = `Not yet — keep the ${stats.currentStreak}-day streak alive.`;
  } else {
    answer = "Not yet. Today's a fresh start.";
  }

  const streak = stats?.currentStreak ?? 0;
  const diff = stats?.difficultyCounts ?? { Easy: 0, Medium: 0, Hard: 0 };
  const diffTotal = diff.Easy + diff.Medium + diff.Hard || 1;

  return (
    <section className="relative overflow-hidden rounded-3xl border bg-card px-6 py-8 shadow-sm sm:px-10 sm:py-10">
      {/* warm hearth glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/50 blur-3xl"
      />

      <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
        {/* Left — the verdict */}
        <div className="text-left">
          <p className="font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-2xl font-medium text-muted-foreground sm:text-3xl">
            Did the boys grind today?
          </h1>
          <p className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            {answer}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <Link href="/upload">
                <Upload className="h-4 w-4" />
                Upload today&apos;s grind
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/quiz">
                <Brain className="h-4 w-4" />
                Generate quiz
              </Link>
            </Button>
          </div>
        </div>

        {/* Right — the streak medallion (the bold moment) */}
        <div className="flex items-center justify-start gap-6 md:flex-col md:items-end md:justify-center md:gap-4 md:text-right">
          <div className="relative flex h-36 w-36 flex-col items-center justify-center rounded-full border border-accent/60 bg-accent/30">
            <Flame
              className={`h-6 w-6 ${streak > 0 ? "text-primary" : "text-muted-foreground"}`}
              strokeWidth={2.2}
            />
            <span className="font-display text-5xl font-bold leading-none tracking-tight">
              {streak}
            </span>
            <span className="mt-1 text-xs font-medium text-muted-foreground">
              day{streak === 1 ? "" : "s"} streak
            </span>
          </div>

          {/* quiet companion stats */}
          <div className="flex gap-5 md:gap-6">
            <div className="text-left md:text-right">
              <div className="flex items-center gap-1.5 text-muted-foreground md:justify-end">
                <Code className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Solved</span>
              </div>
              <p className="font-display text-2xl font-semibold">
                {stats?.totalSolved ?? 0}
              </p>
            </div>
            <div className="text-left md:text-right">
              <div className="flex items-center gap-1.5 text-muted-foreground md:justify-end">
                <Trophy className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Best</span>
              </div>
              <p className="font-display text-2xl font-semibold">
                {stats?.longestStreak ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* slim difficulty ribbon — real data, quiet treatment */}
      {stats && diffTotal > 1 && (
        <div className="relative mt-8">
          <div className="flex h-2 overflow-hidden rounded-full">
            <div
              className="bg-[var(--grind-2)]"
              style={{ width: `${(diff.Easy / diffTotal) * 100}%` }}
            />
            <div
              className="bg-accent"
              style={{ width: `${(diff.Medium / diffTotal) * 100}%` }}
            />
            <div
              className="bg-destructive/70"
              style={{ width: `${(diff.Hard / diffTotal) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--grind-2)]" />
              {diff.Easy} Easy
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {diff.Medium} Medium
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive/70" />
              {diff.Hard} Hard
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
