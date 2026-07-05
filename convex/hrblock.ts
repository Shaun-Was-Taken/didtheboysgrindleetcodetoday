import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { isSoftwareEngineer } from "./jobFetchers";
import { isOwner } from "./access";

// H&R Block runs its careers portal on iCIMS (careers-hrblock.icims.com). There's
// no clean JSON API, so we hit the public job-search page and parse the results
// HTML. Each posting renders as an `iCIMS_JobCardItem` with a title link
// (`/jobs/<id>/<slug>/job`), a location tagged like "US-MO-Remote", and an ID.
const PORTAL = "https://careers-hrblock.icims.com";
const SEARCH = `${PORTAL}/jobs/search`;

// Minimal HTML-entity decode for titles/locations (&amp;, &rsquo;, etc.).
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;|&#8217;/g, "’")
    .replace(/&lsquo;|&#8216;/g, "‘")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// iCIMS locations look like "US-MO-Remote" / "US-MO-Kansas City" for US roles.
// H&R Block runs separate iCIMS portals for India/Ireland, but the main portal
// can still surface non-US listings, so keep only US-prefixed locations.
function isUsLocation(location: string): boolean {
  const l = location.trim().toLowerCase();
  return l.startsWith("us-") || l.includes("united states") || l.includes("usa");
}

interface ParsedJob {
  jobId: string;
  title: string;
  link: string;
  location?: string;
  firstSeen: string;
}

function parseJobs(html: string): ParsedJob[] {
  const jobs: ParsedJob[] = [];
  // Split into per-card chunks so title/location/id stay associated.
  const cards = html.split("iCIMS_JobCardItem").slice(1);
  for (const card of cards) {
    const linkMatch = card.match(
      /href="(https:\/\/careers-hrblock\.icims\.com\/jobs\/(\d+)\/[^"]*?\/job)[^"]*"/i
    );
    if (!linkMatch) continue;
    const [, rawLink, jobId] = linkMatch;

    const titleMatch = card.match(/<h3[^>]*>\s*([\s\S]*?)<\/h3>/i);
    const title = titleMatch ? decodeEntities(titleMatch[1]) : "Unknown Title";
    if (!isSoftwareEngineer(title)) continue;

    const locMatch = card.match(
      /field-label">Location<\/span>\s*<span[^>]*>\s*([^<]*)<\/span>/i
    );
    const location = locMatch ? decodeEntities(locMatch[1]) : undefined;
    if (!location || !isUsLocation(location)) continue;

    jobs.push({
      jobId,
      title,
      link: rawLink, // drop the ?in_iframe=1 query so it opens standalone
      location,
      firstSeen: new Date().toISOString(),
    });
  }
  return jobs;
}

export const fetchHRBlockJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching H&R Block (US) jobs from iCIMS...");

    const allRelevantJobs: ParsedJob[] = [];
    const MAX_PAGES = 20; // safety limit; iCIMS pages are 0-based via `pr`

    try {
      for (let page = 0; page < MAX_PAGES; page++) {
        const url = `${SEARCH}?ss=1&searchKeyword=software+engineer&pr=${page}&in_iframe=1`;
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
        });
        if (!response.ok) {
          console.error(
            `Failed to fetch H&R Block jobs (page ${page}): ${response.statusText}`
          );
          break;
        }
        const html = await response.text();
        const pageJobs = parseJobs(html);
        if (pageJobs.length === 0) break; // no more cards
        allRelevantJobs.push(...pageJobs);
      }
    } catch (error) {
      console.error("Error fetching H&R Block jobs:", error);
      return { status: "error", message: String(error) };
    }

    // Deduplicate by jobId (a posting can repeat across pages).
    const seen = new Set<string>();
    const uniqueJobs = allRelevantJobs.filter((job) => {
      if (seen.has(job.jobId)) return false;
      seen.add(job.jobId);
      return true;
    });

    console.log(`Found ${uniqueJobs.length} H&R Block jobs matching criteria`);

    if (uniqueJobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.hrblock.saveHRBlockJobs, {
          jobs: uniqueJobs,
        });

      if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW H&R Block job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "H&R Block",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new H&R Block jobs (all jobs already tracked)");
      }

      return {
        status: "success",
        jobsFound: uniqueJobs.length,
        newJobs: newJobs.length,
      };
    }

    console.log("✅ No H&R Block jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveHRBlockJobs = internalMutation({
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
        .query("hrblockJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();

      if (!existing) {
        await ctx.db.insert("hrblockJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New H&R Block Job found: ${job.title} - ${job.link}`);
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
    return await ctx.db.query("hrblockJobs").order("desc").collect();
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("hrblockJobs").collect();
    for (const job of jobs) await ctx.db.delete(job._id);
    console.log(`Deleted ${jobs.length} H&R Block jobs`);
    return jobs.length;
  },
});
