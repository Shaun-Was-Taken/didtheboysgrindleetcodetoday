import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fetchGreenhouseJobs } from "./jobFetchers";

export const fetchRobloxJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Roblox jobs from Greenhouse...");

    let jobs;
    try {
      jobs = await fetchGreenhouseJobs("roblox");
    } catch (error) {
      console.error("Error fetching Roblox jobs:", error);
      return { status: "error", message: String(error) };
    }

    console.log(`Found ${jobs.length} Roblox jobs matching criteria`);

    if (jobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.roblox.saveRobloxJobs, { jobs });

      // When EVERY fetched job is new the table was empty (first run), not a
      // real posting burst — seed silently, no email.
      if (newJobs.length > 0 && newJobs.length === jobs.length) {
        console.log(`Seeded ${newJobs.length} Roblox job(s); skipping alert email.`);
      } else if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW Roblox job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "Roblox",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new Roblox jobs (all jobs already tracked)");
      }

      return { status: "success", jobsFound: jobs.length, newJobs: newJobs.length };
    }

    console.log("✅ No Roblox jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveRobloxJobs = internalMutation({
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
        .query("robloxJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();
      if (!existing) {
        await ctx.db.insert("robloxJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New Roblox Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("robloxJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("robloxJobs").collect();
    for (const job of jobs) await ctx.db.delete(job._id);
    console.log(`Deleted ${jobs.length} Roblox jobs`);
    return jobs.length;
  },
});
