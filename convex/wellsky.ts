import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { isOwner } from "./access";
import { fetchWorkdayJobs } from "./jobFetchers";

// WellSky uses Workday. The shared helper fetches the full board (paginated,
// with the first-page-only `total` quirk handled) and filters titles with the
// shared predicate — the old inline keyword search missed Data Engineer roles.
export const fetchWellSkyJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching WellSky jobs from Workday...");

    let uniqueJobs;
    try {
      uniqueJobs = await fetchWorkdayJobs({
        tenant: "wellsky",
        host: "wd1",
        site: "WellSkyCareers",
      });
    } catch (error) {
      console.error("Error fetching WellSky jobs:", error);
      return { status: "error", message: String(error) };
    }

    console.log(`Found ${uniqueJobs.length} WellSky jobs matching criteria`);

    if (uniqueJobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.wellsky.saveWellSkyJobs, {
          jobs: uniqueJobs,
        });

      if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW WellSky job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "WellSky",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new WellSky jobs (all jobs already tracked)");
      }

      return {
        status: "success",
        jobsFound: uniqueJobs.length,
        newJobs: newJobs.length,
      };
    }

    console.log("✅ No WellSky jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveWellSkyJobs = internalMutation({
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
        .query("wellskyJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();

      if (!existing) {
        await ctx.db.insert("wellskyJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New WellSky Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    // Owner-only board: hidden from everyone else (see convex/companies.ts).
    if (!(await isOwner(ctx))) return [];
    return await ctx.db.query("wellskyJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("wellskyJobs").collect();
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }
    console.log(`Deleted ${jobs.length} WellSky jobs`);
    return jobs.length;
  },
});
