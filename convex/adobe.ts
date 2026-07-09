import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { fetchWorkdayJobs } from "./jobFetchers";

// Adobe's Workday tenant is global (careers.adobe.com is just a Phenom shell
// over it), so we restrict to the standard US country facet. Note the intern
// board is a separate Workday site; `external_experienced` is the main one.
const US_COUNTRY_FACET = "bc33aa3152ec42d4995f4791a106ed09";

export const fetchAdobeJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Adobe jobs from Workday...");

    let jobs;
    try {
      jobs = await fetchWorkdayJobs({
        tenant: "adobe",
        host: "wd5",
        site: "external_experienced",
        appliedFacets: { locationCountry: [US_COUNTRY_FACET] },
      });
    } catch (error) {
      console.error("Error fetching Adobe jobs:", error);
      return { status: "error", message: String(error) };
    }

    console.log(`Found ${jobs.length} Adobe jobs matching criteria`);

    if (jobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.adobe.saveAdobeJobs, { jobs });

      // When EVERY fetched job is new the table was empty (first run), not a
      // real posting burst — seed silently, no email.
      if (newJobs.length > 0 && newJobs.length === jobs.length) {
        console.log(`Seeded ${newJobs.length} Adobe job(s); skipping alert email.`);
      } else if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW Adobe job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "Adobe",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new Adobe jobs (all jobs already tracked)");
      }

      return { status: "success", jobsFound: jobs.length, newJobs: newJobs.length };
    }

    console.log("✅ No Adobe jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveAdobeJobs = internalMutation({
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
        .query("adobeJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();
      if (!existing) {
        await ctx.db.insert("adobeJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New Adobe Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("adobeJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("adobeJobs").collect();
    for (const job of jobs) await ctx.db.delete(job._id);
    console.log(`Deleted ${jobs.length} Adobe jobs`);
    return jobs.length;
  },
});
