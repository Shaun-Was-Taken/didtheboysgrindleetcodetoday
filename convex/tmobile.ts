import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { isSoftwareEngineer } from "./jobFetchers";

// T-Mobile uses Workday. Job listings come from the Workday CXS API.
const WORKDAY_TENANT = "tmobile";
const WORKDAY_HOST = "wd1";
const WORKDAY_SITE = "External";

const JOBS_API = `https://${WORKDAY_TENANT}.${WORKDAY_HOST}.myworkdayjobs.com/wday/cxs/${WORKDAY_TENANT}/${WORKDAY_SITE}/jobs`;
const JOB_BASE_URL = `https://${WORKDAY_TENANT}.${WORKDAY_HOST}.myworkdayjobs.com/en-US/${WORKDAY_SITE}`;

interface WorkdayJobPosting {
  title: string;
  externalPath: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
}

export const fetchTMobileJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching T-Mobile (US) jobs from Workday...");

    let offset = 0;
    const limit = 20;
    const MAX_PAGES = 50; // Safety limit
    const allRelevantJobs: {
      jobId: string;
      title: string;
      link: string;
      location?: string;
      firstSeen: string;
    }[] = [];

    try {
      for (let page = 0; page < MAX_PAGES; page++) {
        const response = await fetch(JOBS_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            appliedFacets: {},
            limit,
            offset,
            searchText: "Software Engineer",
          }),
        });

        if (!response.ok) {
          console.error(`Failed to fetch T-Mobile jobs: ${response.statusText}`);
          break;
        }

        const data = await response.json();
        const postings: WorkdayJobPosting[] = data.jobPostings || [];
        const total: number = data.total ?? 0;

        if (postings.length === 0) break;

        for (const posting of postings) {
          const title = posting.title || "Unknown Title";

          // Keep only actual software engineering roles (the keyword search is
          // fuzzy). The shared predicate also handles T-Mobile's inverted naming
          // ("Engineer, Software"), which the old check silently dropped.
          if (!isSoftwareEngineer(title)) continue;

          allRelevantJobs.push({
            jobId: posting.externalPath, // unique canonical path
            title,
            link: `${JOB_BASE_URL}${posting.externalPath}`,
            location: posting.locationsText,
            firstSeen: new Date().toISOString(),
          });
        }

        offset += limit;
        if (offset >= total) break;
      }
    } catch (error) {
      console.error("Error fetching T-Mobile jobs:", error);
      return { status: "error", message: String(error) };
    }

    // Deduplicate by jobId
    const seen = new Set<string>();
    const uniqueJobs = allRelevantJobs.filter((job) => {
      if (seen.has(job.jobId)) return false;
      seen.add(job.jobId);
      return true;
    });

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
