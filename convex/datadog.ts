import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fetchGreenhouseJobs } from "./jobFetchers";

export const fetchDatadogJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Datadog jobs from Greenhouse...");

    let jobs;
    try {
      jobs = await fetchGreenhouseJobs("datadog");
    } catch (error) {
      console.error("Error fetching Datadog jobs:", error);
      return { status: "error", message: String(error) };
    }

    console.log(`Found ${jobs.length} Datadog jobs matching criteria`);

    if (jobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.datadog.saveDatadogJobs, { jobs });

      if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW Datadog job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "Datadog",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new Datadog jobs (all jobs already tracked)");
      }

      return { status: "success", jobsFound: jobs.length, newJobs: newJobs.length };
    }

    console.log("✅ No Datadog jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveDatadogJobs = internalMutation({
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
        .query("datadogJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();
      if (!existing) {
        await ctx.db.insert("datadogJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New Datadog Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("datadogJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("datadogJobs").collect();
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }
    console.log(`Deleted ${jobs.length} Datadog jobs`);
    return jobs.length;
  },
});
