import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fetchWorkdayJobs } from "./jobFetchers";

// NVIDIA's Workday tenant is global, so we restrict to the US country facet.
const US_COUNTRY_FACET = "2fcb99c455831013ea52fb338f2932d8";
const US_FACET_KEY = "locationHierarchy1";

export const fetchNvidiaJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching NVIDIA jobs from Workday...");

    let jobs;
    try {
      jobs = await fetchWorkdayJobs({
        tenant: "nvidia",
        host: "wd5",
        site: "NVIDIAExternalCareerSite",
        appliedFacets: { [US_FACET_KEY]: [US_COUNTRY_FACET] },
      });
    } catch (error) {
      console.error("Error fetching NVIDIA jobs:", error);
      return { status: "error", message: String(error) };
    }

    console.log(`Found ${jobs.length} NVIDIA jobs matching criteria`);

    if (jobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.nvidia.saveNvidiaJobs, { jobs });

      if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW NVIDIA job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "NVIDIA",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new NVIDIA jobs (all jobs already tracked)");
      }

      return { status: "success", jobsFound: jobs.length, newJobs: newJobs.length };
    }

    console.log("✅ No NVIDIA jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveNvidiaJobs = internalMutation({
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
        .query("nvidiaJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();
      if (!existing) {
        await ctx.db.insert("nvidiaJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New NVIDIA Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("nvidiaJobs").order("desc").collect();
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("nvidiaJobs").collect();
    for (const job of jobs) await ctx.db.delete(job._id);
    console.log(`Deleted ${jobs.length} NVIDIA jobs`);
    return jobs.length;
  },
});
