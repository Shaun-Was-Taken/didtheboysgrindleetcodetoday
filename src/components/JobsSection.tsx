"use client";

import { SignInButton } from "@clerk/nextjs";
import { ArrowRight, RefreshCw } from "lucide-react";
import { COMPANIES } from "./brand-logos";
import { Button } from "./ui/button";

function Mark({ company }: { company: (typeof COMPANIES)[number] }) {
  if (company.mono) {
    return (
      <span className="font-display text-xl font-semibold tracking-tight text-foreground/70 transition-colors duration-200 group-hover/tile:text-primary">
        {company.mono}
      </span>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label={company.name}
      className="h-7 w-7 text-foreground/65 transition-colors duration-200 group-hover/tile:text-primary"
    >
      {company.raw ?? <path d={company.path} />}
    </svg>
  );
}

/** Postage-style rubber stamp — the one loud element of the section. */
function FreeStamp() {
  return (
    <svg
      viewBox="0 0 160 160"
      className="h-32 w-32 select-none sm:h-36 sm:w-36"
      style={{ color: "var(--chart-3)" }}
      aria-hidden
    >
      <defs>
        <path
          id="stamp-top"
          d="M 80 80 m -58 0 a 58 58 0 1 1 116 0"
          fill="none"
        />
        <path
          id="stamp-bottom"
          d="M 80 80 m -50 0 a 50 50 0 1 0 100 0"
          fill="none"
        />
      </defs>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.85"
      >
        <circle cx="80" cy="80" r="72" strokeWidth="2" />
        <circle cx="80" cy="80" r="64" />
      </g>
      <g fill="currentColor" opacity="0.85">
        <text className="font-mono text-[12.5px] font-semibold tracking-[0.18em]">
          <textPath href="#stamp-top" startOffset="50%" textAnchor="middle">
            THE&nbsp;BOYS&nbsp;·&nbsp;JOB&nbsp;BOARD
          </textPath>
        </text>
        <text className="font-mono text-[11px] font-semibold tracking-[0.2em]">
          <textPath
            href="#stamp-bottom"
            startOffset="50%"
            textAnchor="middle"
          >
            NEW&nbsp;GRAD&nbsp;·&nbsp;NO&nbsp;CARD
          </textPath>
        </text>
        <text
          x="80"
          y="78"
          textAnchor="middle"
          className="font-display text-[34px] font-bold"
          letterSpacing="-0.5"
        >
          FREE
        </text>
        <text
          x="80"
          y="96"
          textAnchor="middle"
          className="font-mono text-[8.5px] tracking-[0.32em]"
        >
          FOREVER
        </text>
      </g>
    </svg>
  );
}

export default function JobsSection() {
  return (
    <section aria-labelledby="jobs-heading">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent/45 via-card to-card p-6 sm:p-10">
        {/* ambient warmth */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-accent/40 blur-3xl"
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_auto] lg:items-start">
          {/* Pitch */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] font-semibold tracking-[0.16em] text-muted-foreground">
              <RefreshCw className="h-3 w-3 text-primary" />
              REFRESHED EVERY HOUR
            </span>
            <h2
              id="jobs-heading"
              className="mt-4 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Your next job is already on the board
            </h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              While you grind, we watch the careers pages. Fresh new-grad and
              software roles from{" "}
              <span className="font-semibold text-foreground">
                18 top companies
              </span>{" "}
              land on your board automatically — no scraping tabs, no missed
              postings. And like everything here, it&apos;s free.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <SignInButton mode="modal">
                <Button size="lg" className="gap-2 rounded-full px-6">
                  Browse the board
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </SignInButton>
              <span className="text-sm text-muted-foreground">
                No card · no setup · just open it
              </span>
            </div>
          </div>

          {/* Signature stamp */}
          <div className="hidden -rotate-[7deg] lg:block lg:pt-2">
            <FreeStamp />
          </div>
        </div>

        {/* Logo wall */}
        <div className="relative mt-8">
          <p className="mb-3 font-mono text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
            NOW TRACKING
          </p>
          <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
            {COMPANIES.map((c) => (
              <li
                key={c.name}
                className="group/tile flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card/80 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                title={c.name}
              >
                <Mark company={c} />
                <span className="text-[10px] font-medium text-muted-foreground transition-colors group-hover/tile:text-foreground">
                  {c.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
