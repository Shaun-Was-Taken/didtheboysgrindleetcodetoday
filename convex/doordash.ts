import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fetchGreenhouseJobs } from "./jobFetchers";

export const fetchDoorDashJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching DoorDash jobs from Greenhouse...");

    let jobs;
    try {
      // DoorDash's US board lives under "doordashusa" (plain "doordash" is empty).
      jobs = await fetchGreenhouseJobs("doordashusa");
    } catch (error) {
      console.error("Error fetching DoorDash jobs:", error);
      return { status: "error", message: String(error) };
    }

    console.log(`Found ${jobs.length} DoorDash jobs matching criteria`);

    if (jobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.doordash.saveDoorDashJobs, { jobs });

      // When EVERY fetched job is new the table was empty (first run), not a
      // real posting burst — seed silently, no email.
      if (newJobs.length > 0 && newJobs.length === jobs.length) {
        console.log(`Seeded ${newJobs.length} DoorDash job(s); skipping alert email.`);
      } else if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW DoorDash job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "DoorDash",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new DoorDash jobs (all jobs already tracked)");
      }

      return { status: "success", jobsFound: jobs.length, newJobs: newJobs.length };
    }

    console.log("✅ No DoorDash jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveDoorDashJobs = internalMutation({
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
        .query("doordashJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();
      if (!existing) {
        await ctx.db.insert("doordashJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New DoorDash Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("doordashJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("doordashJobs").collect();
    for (const job of jobs) await ctx.db.delete(job._id);
    console.log(`Deleted ${jobs.length} DoorDash jobs`);
    return jobs.length;
  },
});
