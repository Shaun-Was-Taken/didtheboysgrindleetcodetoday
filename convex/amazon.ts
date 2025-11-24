import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const fetchAmazonJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Amazon jobs...");
    const url = "https://amazon.jobs/en/search.json";
    
    const params = new URLSearchParams({
      offset: "0",
      result_limit: "100",
      sort: "recent",
      "category[]": "software-development",
      "job_type[]": "Full-Time",
      "country[]": "USA",
      distanceType: "Mi",
      radius: "24km",
      base_query: "Software Development Engineer",
    });

    try {
      const response = await fetch(`${url}?${params.toString()}`);
      if (!response.ok) {
        console.error(`Failed to fetch Amazon jobs: ${response.statusText}`);
        return { status: "error", message: response.statusText };
      }

      const data = await response.json();
      const jobs = data.jobs || [];
      
      console.log(`Found ${jobs.length} total Amazon jobs`);

      // Filter to only include "Software Development Engineer" in title AND USA locations
      const filteredJobs = jobs.filter((job: any) => {
        const title = job.title || "";
        const location = job.normalized_location || "";
        
        // Check if title includes "Software Development Engineer"
        const hasCorrectTitle = title.includes("Software Development Engineer");
        
        // Check if location is in USA (contains "US" or state names)
        const isUSA = location.includes(", US") || 
                      location.includes("United States") ||
                      /\b[A-Z]{2}\b/.test(location.split(",").pop()?.trim() || ""); // Check for state abbreviation
        
        return hasCorrectTitle && isUSA;
      });

      console.log(`Filtered to ${filteredJobs.length} Software Development Engineer jobs in USA`);

      const jobsToSave = filteredJobs.map((job: any) => ({
        jobId: job.job_path,
        title: job.title || "Unknown Title",
        link: `https://amazon.jobs${job.job_path}`,
        location: job.normalized_location,
        firstSeen: new Date().toISOString(),
      }));

      if (jobsToSave.length > 0) {
        const newJobsCount: number = await ctx.runMutation(internal.amazon.saveAmazonJobs, { jobs: jobsToSave });
        
        if (newJobsCount > 0) {
          console.log(`🎉 Found ${newJobsCount} NEW Amazon job(s)!`);
        } else {
          console.log("✅ No new Amazon jobs (all jobs already tracked)");
        }
        
        return { status: "success", jobsFound: jobsToSave.length, newJobs: newJobsCount };
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
    let newJobsCount = 0;
    for (const job of args.jobs) {
      const existing = await ctx.db
        .query("amazonJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();

      if (!existing) {
        await ctx.db.insert("amazonJobs", job);
        newJobsCount++;
        console.log(`New Amazon Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobsCount;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("amazonJobs").order("desc").collect();
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
