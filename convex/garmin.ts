import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const fetchGarminJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    let page = 1;
    let allRelevantJobs: any[] = [];
    const MAX_PAGES = 50; // Safety limit

    while (page <= MAX_PAGES) {
      console.log(`Fetching Garmin jobs page ${page}...`);
      const url = `https://careers.garmin.com/api/jobs?keywords=Software%20Engineer&sortBy=relevance&page=${page}`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Failed to fetch page ${page}: ${response.statusText}`);
          break;
        }
        const data = await response.json();
        const jobs = data.jobs || [];

        if (jobs.length === 0) {
          console.log("No more jobs found.");
          break;
        }

        for (const jobEntry of jobs) {
          const jobData = jobEntry.data || {};
          const jobId = jobData.req_id;
          const title = jobData.title || "Unknown Title";
          
          if (!jobId) continue;

          const titleLower = title.toLowerCase();
          // Keep all software engineering roles, matching the app-wide convention.
          // (Previously this only matched "software engineer 1"/"2", silently
          // dropping seniors, leads, language-specific, and unnumbered roles.)
          if (titleLower.includes("software engineer") || titleLower.includes("developer")) {
             const slug = jobData.slug || jobId;
             const link = `https://careers.garmin.com/careers/jobs/${slug}`;
             const location = jobData.locations && jobData.locations.length > 0 ? jobData.locations[0] : undefined;

             allRelevantJobs.push({
               jobId,
               title,
               link,
               location,
               firstSeen: new Date().toISOString(),
             });
          }
        }
        
        page++;
        // Be nice to the API
        // await new Promise(resolve => setTimeout(resolve, 200)); 

      } catch (error) {
        console.error(`Error fetching Garmin jobs page ${page}:`, error);
        break;
      }
    }

    if (allRelevantJobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] = await ctx.runMutation(internal.garmin.saveGarminJobs, { jobs: allRelevantJobs });
      
      if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW Garmin job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "Garmin",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new Garmin jobs (all jobs already tracked)");
      }
      
      return { status: "success", jobsFound: allRelevantJobs.length, newJobs: newJobs.length, pagesScanned: page - 1 };
    }
    
    console.log("✅ No new Garmin jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0, pagesScanned: page - 1 };
  },
});

export const saveGarminJobs = internalMutation({
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
        .query("garminJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();

      if (!existing) {
        await ctx.db.insert("garminJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New Garmin Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("garminJobs").order("desc").collect();
  },
});
