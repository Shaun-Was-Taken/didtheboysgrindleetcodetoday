"use client";

import { SignInButton } from "@clerk/nextjs";
import { Code, Flame, Zap, Users, Check, ArrowRight } from "lucide-react";
import JobsSection from "./JobsSection";
import { AuroraText } from "@/components/magicui/aurora-text";
import { SparklesText } from "./magicui/sparkles-text";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Progress } from "./ui/progress";

// Deterministic so server and client render the same quilt (no hydration drift).
const LEVELS = [
  0, 1, 2, 1, 0, 3, 2, 1, 1, 0, 2, 3, 1, 2, 0, 1, 2, 1, 3, 0, 1, 2, 2, 1, 0, 3,
  1, 2,
];
const gridBg = (lvl: number) =>
  lvl === 0
    ? "bg-secondary"
    : lvl === 1
      ? "bg-[var(--grind-1)]"
      : lvl === 2
        ? "bg-[var(--grind-2)]"
        : "bg-[var(--grind-3)]";

function DemoHeatmap() {
  const weeks = 34;
  return (
    <div className="flex justify-center gap-[3px] overflow-hidden">
      {Array.from({ length: weeks }).map((_, w) => (
        <div key={w} className="flex flex-col gap-[3px]">
          {Array.from({ length: 7 }).map((_, d) => (
            <div
              key={d}
              className={`h-3 w-3 rounded-[3px] ${gridBg(
                LEVELS[(w * 7 + d * 11) % LEVELS.length]
              )}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const DEMO_CREW = [
  { name: "You", initials: "Y", count: 2 },
  { name: "Marcus", initials: "M", count: 2 },
  { name: "Devon", initials: "D", count: 1 },
];

const REASONS = [
  {
    icon: Flame,
    title: "Streaks that actually stick",
    body: "A warm heatmap and a small daily goal turn grinding into a habit you don't want to break.",
  },
  {
    icon: Zap,
    title: "Syncs itself from LeetCode",
    body: "Link your username once. Accepted solves land on your heatmap automatically — no screenshots, ever.",
  },
  {
    icon: Users,
    title: "Keep the boys honest",
    body: "A private group leaderboard. Everyone sees who showed up today, so nobody quietly falls off.",
  },
];

const STEPS = [
  { n: "1", title: "Link your LeetCode", body: "Drop in your username — that's the whole setup." },
  { n: "2", title: "Solve your daily problem", body: "Grind on LeetCode like normal. We catch it for you." },
  { n: "3", title: "Keep the streak warm", body: "Watch it grow next to the crew and keep each other going." },
];

export default function LandingPage() {
  return (
    <div className="px-4 py-8 sm:px-6 md:px-12 md:py-12">
      <div className="container mx-auto max-w-5xl space-y-20 md:space-y-28">
        {/* HERO */}
        <section className="animate-fade-in text-center">
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
          <p className="mx-auto mb-8 max-w-2xl px-2 text-base text-muted-foreground sm:text-lg md:text-xl">
            A cozy corner for the crew to log a problem a day, watch the streak
            grow warm, and keep each other showing up.
          </p>
          <div className="flex flex-col items-center gap-3">
            <SignInButton mode="modal">
              <Button size="lg" className="gap-2 rounded-full px-7">
                Start your streak — free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </SignInButton>
            <p className="text-xs text-muted-foreground">
              Free for groups of 3 · no card needed
            </p>
          </div>
        </section>

        {/* DEMO PREVIEW — show, don't tell */}
        <section>
          <p className="mb-4 text-center font-mono text-xs font-medium tracking-[0.18em] text-muted-foreground">
            A PEEK AT YOUR DASHBOARD
          </p>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* streak + heatmap */}
            <Card className="relative overflow-hidden p-6">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/40 blur-3xl"
              />
              <div className="relative">
                <div className="flex items-center gap-5">
                  <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border border-accent/60 bg-accent/30">
                    <Flame className="h-5 w-5 text-primary" strokeWidth={2.2} />
                    <span className="font-display text-3xl font-bold leading-none">
                      12
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      day streak
                    </span>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Solved</p>
                      <p className="font-display text-2xl font-semibold">248</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Best</p>
                      <p className="font-display text-2xl font-semibold">21</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <DemoHeatmap />
                </div>
              </div>
            </Card>

            {/* mini crew leaderboard */}
            <Card className="p-6">
              <h3 className="font-display text-lg font-semibold">
                Today&apos;s Grind
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Goal: 2 problems · The Boys
              </p>
              <ul className="space-y-3">
                {DEMO_CREW.map((m) => {
                  const done = m.count >= 2;
                  return (
                    <li key={m.name} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-muted">
                        <AvatarFallback className="text-xs">
                          {m.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium">{m.name}</span>
                          <span
                            className={`text-xs font-semibold ${done ? "text-primary" : "text-muted-foreground"}`}
                          >
                            {m.count}/2
                          </span>
                        </div>
                        <Progress value={(m.count / 2) * 100} className="h-1.5" />
                      </div>
                      {done && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </section>

        {/* REASONS */}
        <section>
          <h2 className="mb-2 text-center font-display text-3xl font-semibold tracking-tight">
            Why the boys keep showing up
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
            Solo grinding fizzles out. This makes it a group habit you actually
            keep.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {REASONS.map((r) => (
              <Card key={r.title} className="p-6">
                <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <r.icon className="h-5 w-5" />
                </span>
                <h3 className="mb-1 font-display text-lg font-semibold">
                  {r.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {r.body}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* JOBS — auto-tracked, free */}
        <JobsSection />

        {/* HOW IT WORKS */}
        <section>
          <h2 className="mb-10 text-center font-display text-3xl font-semibold tracking-tight">
            Up and running in a minute
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">
                  {s.n}
                </span>
                <h3 className="mb-1 font-display text-base font-semibold">
                  {s.title}
                </h3>
                <p className="mx-auto max-w-xs text-sm text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CLOSING CTA */}
        <section>
          <Card className="relative overflow-hidden p-10 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/40 blur-3xl"
            />
            <div className="relative">
              <h2 className="font-display text-3xl font-semibold tracking-tight">
                Ready to keep the streak warm?
              </h2>
              <p className="mx-auto mb-6 mt-2 max-w-md text-muted-foreground">
                Grab your crew, set a tiny daily goal, and don&apos;t be the one
                who breaks it.
              </p>
              <SignInButton mode="modal">
                <Button size="lg" className="gap-2 rounded-full px-7">
                  Start grinding — free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </SignInButton>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
