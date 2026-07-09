import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fetchWorkdayJobs } from "./jobFetchers";
import { isOwner } from "./access";

// Netsmart uses Workday (tenant "ntst", site "Careers"). The careers URL pins two
// location facets (Overland Park, KS + a second US location), so we apply the same
// `locations` facet to scope results. Title filtering (software engineer/developer)
// is handled by the shared Workday fetcher, matching every other company here.
const LOCATION_FACET_KEY = "locations";
const LOCATION_FACETS = [
  "d5ce43d260f1019c84e96ea1c8c74f78",
  "7d657dc447c4105a4a48b01fadf82acc",
];

export const fetchNetsmartJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Netsmart jobs from Workday...");

    let jobs;
    try {
      jobs = await fetchWorkdayJobs({
        tenant: "ntst",
        host: "wd1",
        site: "Careers",
        appliedFacets: { [LOCATION_FACET_KEY]: LOCATION_FACETS },
      });
    } catch (error) {
      console.error("Error fetching Netsmart jobs:", error);
      return { status: "error", message: String(error) };
    }

    console.log(`Found ${jobs.length} Netsmart jobs matching criteria`);

    if (jobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.netsmart.saveNetsmartJobs, { jobs });

      if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW Netsmart job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "Netsmart",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new Netsmart jobs (all jobs already tracked)");
      }

      return { status: "success", jobsFound: jobs.length, newJobs: newJobs.length };
    }

    console.log("✅ No Netsmart jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveNetsmartJobs = internalMutation({
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
        .query("netsmartJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();
      if (!existing) {
        await ctx.db.insert("netsmartJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New Netsmart Job found: ${job.title} - ${job.link}`);
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
    return await ctx.db.query("netsmartJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("netsmartJobs").collect();
    for (const job of jobs) await ctx.db.delete(job._id);
    console.log(`Deleted ${jobs.length} Netsmart jobs`);
    return jobs.length;
  },
});
