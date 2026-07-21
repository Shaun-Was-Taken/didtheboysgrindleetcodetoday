import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fetchWorkdayJobs } from "./jobFetchers";

// T-Mobile uses Workday. The shared helper fetches the full board (paginated,
// with the first-page-only `total` quirk handled) and filters titles locally.
export const fetchTMobileJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching T-Mobile (US) jobs from Workday...");

    let uniqueJobs;
    try {
      uniqueJobs = await fetchWorkdayJobs({
        tenant: "tmobile",
        host: "wd1",
        site: "External",
      });
    } catch (error) {
      console.error("Error fetching T-Mobile jobs:", error);
      return { status: "error", message: String(error) };
    }

    console.log(`Found ${uniqueJobs.length} T-Mobile jobs matching criteria`);

    if (uniqueJobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.tmobile.saveTMobileJobs, {
          jobs: uniqueJobs,
        });

      if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW T-Mobile job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "T-Mobile",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new T-Mobile jobs (all jobs already tracked)");
      }

      return {
        status: "success",
        jobsFound: uniqueJobs.length,
        newJobs: newJobs.length,
      };
    }

    console.log("✅ No T-Mobile jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveTMobileJobs = internalMutation({
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
        .query("tmobileJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();

      if (!existing) {
        await ctx.db.insert("tmobileJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New T-Mobile Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tmobileJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("tmobileJobs").collect();
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }
    console.log(`Deleted ${jobs.length} T-Mobile jobs`);
    return jobs.length;
  },
});
