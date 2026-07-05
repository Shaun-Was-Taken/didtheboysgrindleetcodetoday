"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import JobAlertBell from "./JobAlertBell";
import { isInternship } from "../../convex/jobFetchers";

interface Job {
  _id: string;
  _creationTime: number;
  jobId: string;
  title: string;
  link: string;
  location?: string;
  firstSeen: string;
}

interface JobBoardProps {
  companyName: string;
  jobs: Job[] | undefined;
  fetchInterval?: string;
  logoUrl?: string;
  maxHeight?: string;
}

import { useState, useEffect } from "react";
import { Search, ChevronDown, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";

const FRESH_WINDOW_MS = 48 * 60 * 60 * 1000;

function isFresh(job: Job): boolean {
  const seen = Date.parse(job.firstSeen);
  return !Number.isNaN(seen) && Date.now() - seen < FRESH_WINDOW_MS;
}

function listedOn(job: Job): string {
  return new Date(job.firstSeen).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function JobBoard({ companyName, jobs, logoUrl, maxHeight = "max-h-[400px]" }: JobBoardProps) {
  const [imageError, setImageError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  const filteredJobs = (jobs ?? []).filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!jobs) {
    return (
      <Card className="w-full max-w-2xl self-start">
        <CardHeader>
          <p className="font-display text-xl">{companyName}</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading jobs…</p>
        </CardContent>
      </Card>
    );
  }

  const freshCount = jobs.filter(isFresh).length;

  return (
    <Card className="w-full max-w-2xl self-start gap-0 py-0 overflow-hidden">
      <CardHeader className="gap-0 px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          {logoUrl && !imageError ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white p-1">
              <img
                src={logoUrl}
                alt=""
                className="h-full w-full object-contain"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <span className="font-display text-base font-semibold text-primary">
                {companyName.charAt(0)}
              </span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-xl leading-tight">
              {companyName}
            </h3>
            <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
              {jobs.length} {jobs.length === 1 ? "role" : "roles"}
              {freshCount > 0 && (
                <span className="text-primary font-semibold">
                  {" "}· {freshCount} fresh
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <JobAlertBell company={companyName} />
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? `Expand ${companyName} jobs` : `Collapse ${companyName} jobs`}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronDown className={`h-5 w-5 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
            </button>
          </div>
        </div>

        {!collapsed && jobs.length > 8 && (
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={`Search ${jobs.length} roles…`}
              className="h-9 pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </CardHeader>

      {!collapsed && (
        <CardContent className="px-2 pb-2 pt-0">
          {filteredJobs.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {jobs.length === 0
                ? "Nothing yet — the watcher checks every hour."
                : "No roles match your search."}
            </p>
          ) : (
            <ul className={`${maxHeight} divide-y divide-border/60 overflow-y-auto`}>
              {filteredJobs.map((job) => {
                const fresh = isFresh(job);
                return (
                  <li key={job.jobId}>
                    <a
                      href={job.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group/row flex items-start gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/70 ${
                        fresh ? "bg-accent/35" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug" title={job.title}>
                          {job.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {job.location ? `${job.location} · ` : ""}
                          <span className="font-mono">{listedOn(job)}</span>
                          {fresh && (
                            <span className="ml-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-primary">
                              FRESH
                            </span>
                          )}
                          {isInternship(job.title) && (
                            <span
                              className="ml-1.5 font-mono text-[10px] font-bold tracking-[0.14em]"
                              style={{ color: "var(--chart-3)" }}
                            >
                              INTERN
                            </span>
                          )}
                        </p>
                      </div>
                      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  );
}
