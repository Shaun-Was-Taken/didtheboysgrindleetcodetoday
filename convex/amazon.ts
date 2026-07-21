import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { isSoftwareEngineer } from "./jobFetchers";

export const fetchAmazonJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Amazon jobs...");
    const url = "https://amazon.jobs/en/search.json";

    // The whole software-development category, newest first, three pages.
    // Deliberately NO job_type or base_query narrowing: `job_type=Full-Time`
    // silently excluded every SDE internship, and the keyword base_query
    // relevance-ranked away non-"SDE"-titled roles. The category itself is the
    // population; the shared title predicate filters locally.
    const jobsRaw: any[] = [];
    try {
      for (const offset of [0, 100, 200]) {
        const params = new URLSearchParams({
          offset: String(offset),
          result_limit: "100",
          sort: "recent",
          "category[]": "software-development",
          "country[]": "USA",
        });
        const response = await fetch(`${url}?${params.toString()}`);
        if (!response.ok) {
          console.error(`Failed to fetch Amazon jobs: ${response.statusText}`);
          break;
        }
        const data = await response.json();
        const page = data.jobs || [];
        if (page.length === 0) break;
        jobsRaw.push(...page);
      }

      console.log(`Found ${jobsRaw.length} total Amazon jobs`);

      const filteredJobs = jobsRaw.filter((job: any) => {
        const title = job.title || "";
        const location = job.normalized_location || "";

        if (!isSoftwareEngineer(title)) return false;

        // Check if location is in USA (contains "US" or state names)
        const isUSA = location.includes(", US") ||
                      location.includes("United States") ||
                      /\b[A-Z]{2}\b/.test(location.split(",").pop()?.trim() || ""); // Check for state abbreviation

        return isUSA;
      });

      console.log(`Filtered to ${filteredJobs.length} software engineering jobs in USA`);

      const jobsToSave = filteredJobs.map((job: any) => ({
        jobId: job.job_path,
        title: job.title || "Unknown Title",
        link: `https://amazon.jobs${job.job_path}`,
        location: job.normalized_location,
        firstSeen: new Date().toISOString(),
      }));

      if (jobsToSave.length > 0) {
        const newJobs: { title: string; link: string; location?: string }[] = await ctx.runMutation(internal.amazon.saveAmazonJobs, { jobs: jobsToSave });
        
        if (newJobs.length > 0) {
          console.log(`🎉 Found ${newJobs.length} NEW Amazon job(s)!`);
          await ctx.runAction(internal.email.sendNewJobsEmail, {
            company: "Amazon",
            jobs: newJobs,
          });
        } else {
          console.log("✅ No new Amazon jobs (all jobs already tracked)");
        }
        
        return { status: "success", jobsFound: jobsToSave.length, newJobs: newJobs.length };
      }

      console.log("✅ No new Amazon jobs found");
      return { status: "success", jobsFound: 0, newJobs: 0 };
    } catch (error) {
      console.error("Error fetching Amazon jobs:", error);
      return { status: "error", message: String(error) };
    }
  },
});

export const saveAmazonJobs = internalMutation({
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
        .query("amazonJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();

      if (!existing) {
        await ctx.db.insert("amazonJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New Amazon Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("amazonJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("amazonJobs").collect();
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }
    console.log(`Deleted ${jobs.length} Amazon jobs`);
    return jobs.length;
  },
});
