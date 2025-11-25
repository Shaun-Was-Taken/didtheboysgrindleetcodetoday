import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const ADZUNA_APP_ID = "908d48e7";
const ADZUNA_APP_KEY = "ea3bde2a25d0e33d947cf3c9696c6fb0";

export const fetchMicrosoftJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Microsoft jobs from Adzuna...");
    
    try {
      const params = new URLSearchParams({
        app_id: ADZUNA_APP_ID,
        app_key: ADZUNA_APP_KEY,
        results_per_page: "100",
        what: "software engineer",
        company: "microsoft",
        where: "united states",
        sort_by: "date", // Get newest first
      });

      const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch Microsoft jobs: ${response.statusText}`);
        return { status: "error", message: response.statusText };
      }

      const data = await response.json();
      const jobs = data.results || [];
      
      console.log(`Found ${jobs.length} Microsoft jobs from Adzuna (${data.count} total available)`);

      const jobsToSave = jobs.map((job: any) => {
        // Extract location string from Adzuna location object
        const location = job.location?.display_name || 
                        job.location?.area?.join(", ") || 
                        "United States";

        return {
          jobId: String(job.id),
          title: job.title || "Unknown Title",
          link: job.redirect_url || "",
          location,
          firstSeen: new Date().toISOString(),
        };
      });

      if (jobsToSave.length > 0) {
        const newJobsCount: number = await ctx.runMutation(
          internal.microsoft.saveMicrosoftJobs, 
          { jobs: jobsToSave }
        );
        
        if (newJobsCount > 0) {
          console.log(`🎉 Found ${newJobsCount} NEW Microsoft job(s)!`);
        } else {
          console.log("✅ No new Microsoft jobs (all jobs already tracked)");
        }
        
        return { 
          status: "success", 
          jobsFound: jobsToSave.length, 
          newJobs: newJobsCount,
          totalAvailable: data.count 
        };
      }

      console.log("✅ No Microsoft jobs found");
      return { status: "success", jobsFound: 0, newJobs: 0, totalAvailable: 0 };
    } catch (error) {
      console.error("Error fetching Microsoft jobs:", error);
      return { status: "error", message: String(error) };
    }
  },
});

export const saveMicrosoftJobs = internalMutation({
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
        .query("microsoftJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();

      if (!existing) {
        await ctx.db.insert("microsoftJobs", job);
        newJobsCount++;
        console.log(`New Microsoft Job found: ${job.title} - ${job.location}`);
      }
    }
    return newJobsCount;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("microsoftJobs").order("desc").collect();
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("microsoftJobs").collect();
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }
    console.log(`Deleted ${jobs.length} Microsoft jobs`);
    return jobs.length;
  },
});
