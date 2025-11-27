import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

interface AtlassianJob {
  id: number;
  title: string;
  locations: string[];
  category: string;
  applyUrl: string;
  overview: string;
}

export const fetchAtlassianJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching Atlassian jobs...");
    try {
      const response = await fetch("https://www.atlassian.com/endpoint/careers/listings");
      if (!response.ok) {
        console.error("Failed to fetch Atlassian jobs:", response.statusText);
        return { status: "error", message: response.statusText };
      }

      const jobs: AtlassianJob[] = await response.json();

      const filteredJobs = jobs.filter((job) => {
        const title = job.title.toLowerCase();
        const locations = job.locations.join(" ").toLowerCase();
        const category = job.category.toLowerCase();

        const isSoftwareEngineer = title.includes("software engineer") || title.includes("developer");
        const isEngineering = category.includes("engineering");
        
        // Check if any location is strictly US or Remote
        const isUSOrRemote = job.locations.some(loc => {
          const l = loc.toLowerCase();
          return l.includes("united states") || l.includes("remote") || l === "us" || l.includes("usa");
        });

        return (isSoftwareEngineer || isEngineering) && isUSOrRemote;
      });

      // Deduplicate jobs by ID
      const seenIds = new Set<number>();
      const uniqueJobs = filteredJobs.filter(job => {
        if (seenIds.has(job.id)) {
          return false;
        }
        seenIds.add(job.id);
        return true;
      });

      console.log(`Found ${uniqueJobs.length} Atlassian jobs matching criteria`);

      const jobsToSave = uniqueJobs.map((job) => ({
        jobId: job.id.toString(),
        title: job.title,
        location: job.locations.find(l => l.includes("United States") || l.includes("Remote")) || job.locations[0],
        link: job.applyUrl,
        firstSeen: new Date().toISOString(),
      }));

      if (jobsToSave.length > 0) {
        const newJobsCount: number = await ctx.runMutation(internal.atlassian.saveAtlassianJobs, { jobs: jobsToSave });
        
        if (newJobsCount > 0) {
          console.log(`🎉 Found ${newJobsCount} NEW Atlassian job(s)!`);
        } else {
          console.log("✅ No new Atlassian jobs (all jobs already tracked)");
        }
        
        return { status: "success", jobsFound: jobsToSave.length, newJobs: newJobsCount };
      }

      return { status: "success", jobsFound: 0, newJobs: 0 };
    } catch (error) {
      console.error("Error fetching Atlassian jobs:", error);
      return { status: "error", message: String(error) };
    }
  },
});

export const saveAtlassianJobs = internalMutation({
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
        .query("atlassianJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();

      if (!existing) {
        await ctx.db.insert("atlassianJobs", job);
        newJobsCount++;
        console.log(`New Atlassian Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobsCount;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("atlassianJobs").order("desc").collect();
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("atlassianJobs").collect();
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }
    console.log(`Deleted ${jobs.length} Atlassian jobs`);
    return jobs.length;
  },
});
