import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fetchGreenhouseJobs } from "./jobFetchers";

export const fetchDiscordJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Discord jobs from Greenhouse...");

    let jobs;
    try {
      jobs = await fetchGreenhouseJobs("discord");
    } catch (error) {
      console.error("Error fetching Discord jobs:", error);
      return { status: "error", message: String(error) };
    }

    console.log(`Found ${jobs.length} Discord jobs matching criteria`);

    if (jobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.discord.saveDiscordJobs, { jobs });

      if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW Discord job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "Discord",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new Discord jobs (all jobs already tracked)");
      }

      return { status: "success", jobsFound: jobs.length, newJobs: newJobs.length };
    }

    console.log("✅ No Discord jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveDiscordJobs = internalMutation({
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
        .query("discordJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();
      if (!existing) {
        await ctx.db.insert("discordJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New Discord Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("discordJobs").order("desc").collect();
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("discordJobs").collect();
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }
    console.log(`Deleted ${jobs.length} Discord jobs`);
    return jobs.length;
  },
});
