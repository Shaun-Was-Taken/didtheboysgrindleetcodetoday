import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fetchGoogleJobs } from "./jobFetchers";

export const fetchGoogleJobsAction = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Google jobs from careers site...");

    let jobs;
    try {
      jobs = await fetchGoogleJobs();
    } catch (error) {
      console.error("Error fetching Google jobs:", error);
      return { status: "error", message: String(error) };
    }

    console.log(`Found ${jobs.length} Google jobs matching criteria`);

    if (jobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.google.saveGoogleJobs, { jobs });

      if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW Google job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "Google",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new Google jobs (all jobs already tracked)");
      }

      return { status: "success", jobsFound: jobs.length, newJobs: newJobs.length };
    }

    console.log("✅ No Google jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveGoogleJobs = internalMutation({
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
        .query("googleJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();
      if (!existing) {
        await ctx.db.insert("googleJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New Google Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("googleJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("googleJobs").collect();
    for (const job of jobs) await ctx.db.delete(job._id);
    console.log(`Deleted ${jobs.length} Google jobs`);
    return jobs.length;
  },
});
