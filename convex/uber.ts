import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { isSoftwareEngineer } from "./jobFetchers";

// Uber runs its own careers API. An empty query with a large limit returns
// every US posting in one response (the `page` param is ignored server-side),
// so we over-fetch and filter titles in code. The endpoint requires the dummy
// `x-csrf-token: x` header the careers site itself sends.
const UBER_API = "https://www.uber.com/api/loadSearchJobsResults?localeCode=en";

interface UberLocation {
  city?: string;
  region?: string;
  countryName?: string;
}

interface UberJob {
  id: number;
  title: string;
  location?: UberLocation;
  allLocations?: UberLocation[];
}

export const fetchUberJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Uber (US) jobs from careers API...");

    const allRelevantJobs: {
      jobId: string;
      title: string;
      link: string;
      location?: string;
      firstSeen: string;
    }[] = [];

    try {
      const response = await fetch(UBER_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-csrf-token": "x",
          "User-Agent": "Mozilla/5.0",
        },
        body: JSON.stringify({
          params: {
            query: "",
            location: [{ country: "USA" }],
            limit: 2000,
            page: 0,
          },
        }),
      });

      if (!response.ok) {
        console.error(`Failed to fetch Uber jobs: ${response.statusText}`);
        return { status: "error", message: response.statusText };
      }

      const data = await response.json();
      const results: UberJob[] = data.data?.results || [];

      for (const job of results) {
        const title = job.title || "Unknown Title";
        if (!isSoftwareEngineer(title)) continue;

        const locs = job.allLocations?.length
          ? job.allLocations
          : job.location
            ? [job.location]
            : [];
        const location = locs
          .map((l) => [l.city, l.region].filter(Boolean).join(", "))
          .filter(Boolean)
          .join(" / ");

        allRelevantJobs.push({
          jobId: String(job.id),
          title,
          link: `https://www.uber.com/global/en/careers/list/${job.id}/`,
          location: location || undefined,
          firstSeen: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error fetching Uber jobs:", error);
      return { status: "error", message: String(error) };
    }

    // Deduplicate by jobId
    const seen = new Set<string>();
    const uniqueJobs = allRelevantJobs.filter((job) => {
      if (seen.has(job.jobId)) return false;
      seen.add(job.jobId);
      return true;
    });

    console.log(`Found ${uniqueJobs.length} Uber jobs matching criteria`);

    if (uniqueJobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.uber.saveUberJobs, { jobs: uniqueJobs });

      // When EVERY fetched job is new the table was empty (first run), not a
      // real posting burst — seed silently, no email.
      if (newJobs.length > 0 && newJobs.length === uniqueJobs.length) {
        console.log(
          `Seeded ${newJobs.length} Uber job(s); skipping alert email.`,
        );
      } else if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW Uber job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "Uber",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new Uber jobs (all jobs already tracked)");
      }

      return {
        status: "success",
        jobsFound: uniqueJobs.length,
        newJobs: newJobs.length,
      };
    }

    console.log("✅ No Uber jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveUberJobs = internalMutation({
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
        .query("uberJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();
      if (!existing) {
        await ctx.db.insert("uberJobs", job);
        newJobs.push({
          title: job.title,
          link: job.link,
          location: job.location,
        });
        console.log(`New Uber Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("uberJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("uberJobs").collect();
    for (const job of jobs) await ctx.db.delete(job._id);
    console.log(`Deleted ${jobs.length} Uber jobs`);
    return jobs.length;
  },
});
