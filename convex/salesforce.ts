import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fetchWorkdayJobs } from "./jobFetchers";

// Salesforce's Workday tenant is global, so we restrict to the US country facet.
const US_COUNTRY_FACET = "bc33aa3152ec42d4995f4791a106ed09";
const US_FACET_KEY =
  "CF_-_REC_-_LRV_-_Job_Posting_Anchor_-_Country_from_Job_Posting_Location_Extended";

export const fetchSalesforceJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Salesforce jobs from Workday...");

    let jobs;
    try {
      jobs = await fetchWorkdayJobs({
        tenant: "salesforce",
        host: "wd12",
        site: "External_Career_Site",
        appliedFacets: { [US_FACET_KEY]: [US_COUNTRY_FACET] },
      });
    } catch (error) {
      console.error("Error fetching Salesforce jobs:", error);
      return { status: "error", message: String(error) };
    }

    console.log(`Found ${jobs.length} Salesforce jobs matching criteria`);

    if (jobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.salesforce.saveSalesforceJobs, { jobs });

      if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW Salesforce job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "Salesforce",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new Salesforce jobs (all jobs already tracked)");
      }

      return { status: "success", jobsFound: jobs.length, newJobs: newJobs.length };
    }

    console.log("✅ No Salesforce jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveSalesforceJobs = internalMutation({
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
        .query("salesforceJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();
      if (!existing) {
        await ctx.db.insert("salesforceJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New Salesforce Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("salesforceJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("salesforceJobs").collect();
    for (const job of jobs) await ctx.db.delete(job._id);
    console.log(`Deleted ${jobs.length} Salesforce jobs`);
    return jobs.length;
  },
});
