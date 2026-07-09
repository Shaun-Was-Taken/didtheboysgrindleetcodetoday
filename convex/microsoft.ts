import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { isSoftwareEngineer } from "./jobFetchers";

// Microsoft's careers site (apply.careers.microsoft.com) runs on Eightfold's
// "PCSX" platform, whose search API is public JSON. This replaced the old
// Adzuna aggregator source, which re-listed the same role under new ids and
// bloated the table with duplicates. Eightfold position ids are stable, so
// plain jobId dedupe works here.
//
// API quirks: page size is capped at 10 regardless of `num`, and requests
// closer together than ~1s get rate-limited (empty 200 body) — hence the
// pacing delay between pages.
const PCSX_API = "https://apply.careers.microsoft.com/api/pcsx/search";
const PAGE_SIZE = 10;
const PAGE_DELAY_MS = 1500;

interface PcsxPosition {
  id: number;
  name: string;
  locations?: string[];
  standardizedLocations?: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const fetchMicrosoftJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Microsoft (US) jobs from careers API...");

    const allRelevantJobs: {
      jobId: string;
      title: string;
      link: string;
      location?: string;
      firstSeen: string;
    }[] = [];

    try {
      const MAX_PAGES = 40;
      for (let page = 0; page < MAX_PAGES; page++) {
        const start = page * PAGE_SIZE;
        const params = new URLSearchParams({
          domain: "microsoft.com",
          filter_profession: "Software Engineering",
          location: "United States",
          start: String(start),
          num: String(PAGE_SIZE),
          sort_by: "timestamp",
        });
        const res = await fetch(`${PCSX_API}?${params.toString()}`, {
          headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        });
        if (!res.ok) {
          console.error(
            `Microsoft fetch failed (page ${page}): ${res.statusText}`,
          );
          break;
        }

        // Rate-limited responses come back as 200 with an empty body.
        let data;
        try {
          data = JSON.parse(await res.text());
        } catch {
          console.warn(
            `Microsoft fetch rate-limited on page ${page}; stopping early.`,
          );
          break;
        }

        const positions: PcsxPosition[] = data.data?.positions || [];
        const total: number = data.data?.count ?? 0;
        if (positions.length === 0) break;

        for (const p of positions) {
          const title = p.name || "Unknown Title";
          if (!isSoftwareEngineer(title)) continue;
          const location =
            (p.standardizedLocations?.length
              ? p.standardizedLocations
              : p.locations || []
            ).join(" / ") || undefined;
          allRelevantJobs.push({
            jobId: String(p.id),
            title,
            link: `https://apply.careers.microsoft.com/careers/job/${p.id}`,
            location,
            firstSeen: new Date().toISOString(),
          });
        }

        if (start + positions.length >= total) break;
        await sleep(PAGE_DELAY_MS);
      }
    } catch (error) {
      console.error("Error fetching Microsoft jobs:", error);
      return { status: "error", message: String(error) };
    }

    // Deduplicate by jobId
    const seen = new Set<string>();
    const uniqueJobs = allRelevantJobs.filter((job) => {
      if (seen.has(job.jobId)) return false;
      seen.add(job.jobId);
      return true;
    });

    console.log(`Found ${uniqueJobs.length} Microsoft jobs matching criteria`);

    if (uniqueJobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.microsoft.saveMicrosoftJobs, {
          jobs: uniqueJobs,
        });

      // When EVERY fetched job is new the table was empty (first run or a
      // source swap), not a real posting burst — seed silently, no email.
      if (newJobs.length > 0 && newJobs.length === uniqueJobs.length) {
        console.log(
          `Seeded ${newJobs.length} Microsoft job(s); skipping alert email.`,
        );
      } else if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW Microsoft job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "Microsoft",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new Microsoft jobs (all jobs already tracked)");
      }

      return {
        status: "success",
        jobsFound: uniqueJobs.length,
        newJobs: newJobs.length,
      };
    }

    console.log("✅ No Microsoft jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveMicrosoftJobs = internalMutation({
  args: {
    jobs: v.array(
      v.object({
        jobId: v.string(),
        title: v.string(),
        link: v.string(),
        location: v.optional(v.string()),
        firstSeen: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const newJobs: { title: string; link: string; location?: string }[] = [];
    for (const job of args.jobs) {
      const existing = await ctx.db
        .query("microsoftJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();

      if (!existing) {
        await ctx.db.insert("microsoftJobs", job);
        newJobs.push({
          title: job.title,
          link: job.link,
          location: job.location,
        });
        console.log(`New Microsoft Job found: ${job.title} - ${job.location}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("microsoftJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("microsoftJobs").collect();
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }
    console.log(`Deleted ${jobs.length} Microsoft jobs`);
    return jobs.length;
  },
});
