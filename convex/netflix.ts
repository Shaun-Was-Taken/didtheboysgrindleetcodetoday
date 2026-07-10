import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { isSoftwareEngineer, isUsLocation } from "./jobFetchers";

// Netflix runs its careers site on Eightfold (explore.jobs.netflix.net). Unlike
// Microsoft's PCSX-locked instance, the standard Eightfold jobs API is open
// here. Page size is server-capped at 10; a short delay between pages keeps us
// clear of any rate limiting.
const NETFLIX_API = "https://explore.jobs.netflix.net/api/apply/v2/jobs";
const PAGE_SIZE = 10;
const PAGE_DELAY_MS = 800;

interface EightfoldPosition {
  id: number;
  name: string;
  location?: string;
  locations?: string[];
  canonicalPositionUrl?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const fetchNetflixJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Netflix (US) jobs from careers API...");

    const allRelevantJobs: {
      jobId: string;
      title: string;
      link: string;
      location?: string;
      firstSeen: string;
    }[] = [];

    try {
      const MAX_PAGES = 30;
      for (let page = 0; page < MAX_PAGES; page++) {
        const start = page * PAGE_SIZE;
        const params = new URLSearchParams({
          domain: "netflix.com",
          query: "software engineer",
          location: "United States",
          start: String(start),
          num: String(PAGE_SIZE),
          sort_by: "timestamp",
        });
        const res = await fetch(`${NETFLIX_API}?${params.toString()}`, {
          headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        });
        if (!res.ok) {
          console.error(`Netflix fetch failed (page ${page}): ${res.statusText}`);
          break;
        }
        const data = await res.json();
        const positions: EightfoldPosition[] = data.positions || [];
        const total: number = data.count ?? 0;
        if (positions.length === 0) break;

        for (const p of positions) {
          const title = p.name || "Unknown Title";
          if (!isSoftwareEngineer(title)) continue;
          const location = p.locations?.length
            ? p.locations.join(" / ")
            : p.location;
          // The location param biases results but the API can still return
          // remote/global postings — keep only US ones.
          if (!isUsLocation(location)) continue;
          allRelevantJobs.push({
            jobId: String(p.id),
            title,
            link:
              p.canonicalPositionUrl ||
              `https://explore.jobs.netflix.net/careers/job/${p.id}`,
            location,
            firstSeen: new Date().toISOString(),
          });
        }

        if (start + positions.length >= total) break;
        await sleep(PAGE_DELAY_MS);
      }
    } catch (error) {
      console.error("Error fetching Netflix jobs:", error);
      return { status: "error", message: String(error) };
    }

    // Deduplicate by jobId
    const seen = new Set<string>();
    const uniqueJobs = allRelevantJobs.filter((job) => {
      if (seen.has(job.jobId)) return false;
      seen.add(job.jobId);
      return true;
    });

    console.log(`Found ${uniqueJobs.length} Netflix jobs matching criteria`);

    if (uniqueJobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.netflix.saveNetflixJobs, {
          jobs: uniqueJobs,
        });

      // When EVERY fetched job is new the table was empty (first run), not a
      // real posting burst — seed silently, no email.
      if (newJobs.length > 0 && newJobs.length === uniqueJobs.length) {
        console.log(`Seeded ${newJobs.length} Netflix job(s); skipping alert email.`);
      } else if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW Netflix job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "Netflix",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new Netflix jobs (all jobs already tracked)");
      }

      return {
        status: "success",
        jobsFound: uniqueJobs.length,
        newJobs: newJobs.length,
      };
    }

    console.log("✅ No Netflix jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveNetflixJobs = internalMutation({
  args: {
    jobs: v.array(
      v.object({
        jobId: v.string(),
        title: v.string(),
        link: v.string(),
        location: v.optional(v.string()),
        firstSeen: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const newJobs: { title: string; link: string; location?: string }[] = [];
    for (const job of args.jobs) {
      const existing = await ctx.db
        .query("netflixJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();
      if (!existing) {
        await ctx.db.insert("netflixJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New Netflix Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("netflixJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("netflixJobs").collect();
    for (const job of jobs) await ctx.db.delete(job._id);
    console.log(`Deleted ${jobs.length} Netflix jobs`);
    return jobs.length;
  },
});
