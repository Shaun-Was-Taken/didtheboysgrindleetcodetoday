import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { isSoftwareEngineer } from "./jobFetchers";

// GM's careers site (search-careers.gm.com) is fully server-rendered: each
// `?page=N&pagesize=50` request returns the job cards as HTML. It's fronted by
// Cloudflare, which 403s naive clients (e.g. curl) — but a browser-like fetch
// with a real User-Agent passes, so we scrape the results pages directly and
// parse the cards. The URL pins country=United States of America for US-only
// results; the app-wide title filter (software engineer / developer) narrows the
// fuzzy keyword search to actual SWE roles, matching the other trackers.
const BASE = "https://search-careers.gm.com/en/jobs/";
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

interface ParsedJob {
  jobId: string;
  title: string;
  link: string;
  location?: string;
  firstSeen: string;
}

function parsePage(htmlText: string): ParsedJob[] {
  const jobs: ParsedJob[] = [];
  // Each posting is a `card card-job` block with a title anchor and a
  // map-marker location line.
  const cards = htmlText.split("card card-job").slice(1);
  for (const card of cards) {
    const linkMatch = card.match(
      /<a class="stretched-link" href="(\/en\/jobs\/(jr-\d+)\/[^"]*)"\s*>([\s\S]*?)<\/a>/i
    );
    if (!linkMatch) continue;
    const [, rawHref, jobId, rawTitle] = linkMatch;
    const title = rawTitle
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (!isSoftwareEngineer(title)) continue;

    const locMatch = card.match(/map-marker"><\/use>\s*<\/svg>\s*([^<]*)</i);
    const location = locMatch
      ? locMatch[1].replace(/\s+/g, " ").trim()
      : undefined;

    jobs.push({
      jobId,
      title,
      link: "https://search-careers.gm.com" + rawHref.replace(/&amp;/g, "&"),
      location,
      firstSeen: new Date().toISOString(),
    });
  }
  return jobs;
}

export const fetchGMJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching GM (US) jobs from careers site...");

    const allRelevantJobs: ParsedJob[] = [];
    const MAX_PAGES = 40; // safety limit; ~13 pages at 50/page currently

    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = `${BASE}?search=software+engineer&country=United+States+of+America&pagesize=50&page=${page}`;
        const response = await fetch(url, { headers: BROWSER_HEADERS });
        if (!response.ok) {
          console.error(
            `Failed to fetch GM jobs (page ${page}): ${response.status} ${response.statusText}`
          );
          break;
        }
        const htmlText = await response.text();
        // A page with no job-card anchors means we've run past the last page.
        const hasCards = /<a class="stretched-link" href="\/en\/jobs\/jr-/i.test(
          htmlText
        );
        if (!hasCards) break;
        allRelevantJobs.push(...parsePage(htmlText));
      }
    } catch (error) {
      console.error("Error fetching GM jobs:", error);
      return { status: "error", message: String(error) };
    }

    // Deduplicate by jobId (a posting spanning multiple locations can repeat).
    const seen = new Set<string>();
    const uniqueJobs = allRelevantJobs.filter((job) => {
      if (seen.has(job.jobId)) return false;
      seen.add(job.jobId);
      return true;
    });

    console.log(`Found ${uniqueJobs.length} GM jobs matching criteria`);

    if (uniqueJobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.gm.saveGMJobs, { jobs: uniqueJobs });

      if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW GM job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "GM",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new GM jobs (all jobs already tracked)");
      }

      return {
        status: "success",
        jobsFound: uniqueJobs.length,
        newJobs: newJobs.length,
      };
    }

    console.log("✅ No GM jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveGMJobs = internalMutation({
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
        .query("gmJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();

      if (!existing) {
        await ctx.db.insert("gmJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New GM Job found: ${job.title} - ${job.location}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("gmJobs").order("desc").take(200);
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("gmJobs").collect();
    for (const job of jobs) await ctx.db.delete(job._id);
    console.log(`Deleted ${jobs.length} GM jobs`);
    return jobs.length;
  },
});
