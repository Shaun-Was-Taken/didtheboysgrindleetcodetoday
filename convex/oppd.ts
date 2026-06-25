import { internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// OPPD (Omaha Public Power District) runs an Oracle PeopleSoft Fluid Candidate
// Gateway rather than a clean JSON API. There is no public endpoint, so we have
// to drive the same stateful flow a browser does:
//   1. GET the job-search page to obtain a guest session (PSJSESSIONID + the
//      load-balancer BIGip cookie) and the ICSID / ICStateNum state tokens.
//   2. POST the "Search" button ICAction with a keyword to get the results grid
//      back as a PeopleSoft AJAX partial (XML-wrapped HTML).
//   3. Scrape the grid for title / JobOpeningId / location and build a public
//      deep-link to each posting.
// OPPD is a local utility, so every posting is in Omaha, NE and there are no
// "software engineer" roles. Per the site owner we track any "engineer" title.

const BASE =
  "https://jobsp.oppd.com/psc/jobs/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL";
const SEARCH_PAGE_URL = `${BASE}?Page=HRS_APP_SCHJOB_FL&Action=U`;
const SEARCH_BTN = "HRS_SCH_WRK_FLU_HRS_SEARCH_BTN";
const KEYWORD = "engineer";

// Minimal cookie jar: PeopleSoft hands out several Set-Cookie headers (session +
// load-balancer affinity) that all must be echoed back or the next request 302s
// to a fresh, empty session.
function mergeSetCookies(jar: Map<string, string>, res: Response) {
  // Prefer getSetCookie() (handles multiple headers); fall back to the combined
  // single header otherwise.
  const raw: string[] =
    typeof (res.headers as any).getSetCookie === "function"
      ? (res.headers as any).getSetCookie()
      : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie") as string] : []);
  for (const line of raw) {
    // A combined header may contain several cookies separated by ", " before a
    // "name=" token; split conservatively on that boundary.
    for (const part of line.split(/,(?=[^;]+?=)/)) {
      const first = part.split(";")[0].trim();
      const eq = first.indexOf("=");
      if (eq > 0) jar.set(first.slice(0, eq), first.slice(eq + 1));
    }
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// Pull a PeopleSoft hidden field value out of the page HTML.
function hidden(html: string, name: string): string | undefined {
  const m = html.match(
    new RegExp(`name=['"]${name}['"][^>]*value=['"]([^'"]*)['"]`)
  );
  return m?.[1];
}

// Collect a column of grid cells keyed by row index, e.g. SCH_JOB_TITLE$0..N.
function gridColumn(html: string, fieldId: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = new RegExp(`id=['"]${fieldId}\\$(\\d+)['"][^>]*>([^<]*)`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.set(m[1], decodeEntities(m[2]));
  }
  return out;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

type OppdJob = {
  jobId: string;
  title: string;
  link: string;
  location?: string;
  firstSeen: string;
};

async function scrapeOppdJobs(): Promise<OppdJob[]> {
  const jar = new Map<string, string>();

  // Step 1 — follow the initial 302 manually so we capture the session cookies
  // it sets, then load the real search page to read the state tokens.
  const r1 = await fetch(SEARCH_PAGE_URL, {
    headers: { "User-Agent": UA },
    redirect: "manual",
  });
  mergeSetCookies(jar, r1);
  const landingUrl =
    r1.status >= 300 && r1.status < 400 && r1.headers.get("location")
      ? new URL(r1.headers.get("location") as string, SEARCH_PAGE_URL).toString()
      : SEARCH_PAGE_URL;

  const r2 = await fetch(landingUrl, {
    headers: { "User-Agent": UA, Cookie: cookieHeader(jar) },
    redirect: "manual",
  });
  mergeSetCookies(jar, r2);
  const page = await r2.text();

  const icsid = hidden(page, "ICSID");
  const stateNum = hidden(page, "ICStateNum") ?? "1";
  if (!icsid) {
    throw new Error("Could not obtain OPPD ICSID token (session not established)");
  }

  // Step 2 — submit the search. The grid comes back as a PeopleSoft AJAX partial.
  const body = new URLSearchParams({
    ICAJAX: "1",
    ICType: "Panel",
    ICElementNum: "0",
    ICStateNum: stateNum,
    ICAction: SEARCH_BTN,
    ICSID: icsid,
    "HRS_SCH_WRK_HRS_SCH_TEXT100$0": KEYWORD,
  });

  const r3 = await fetch(BASE, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Cookie: cookieHeader(jar),
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: landingUrl,
    },
    body: body.toString(),
  });
  const grid = await r3.text();

  // Step 3 — parse the results grid.
  const titles = gridColumn(grid, "SCH_JOB_TITLE");
  const ids = gridColumn(grid, "HRS_APP_JBSCH_I_HRS_JOB_OPENING_ID");
  const locations = gridColumn(grid, "LOCATION");

  const jobs: OppdJob[] = [];
  for (const [row, title] of titles) {
    const jobId = ids.get(row);
    if (!jobId || !title) continue;
    if (!title.toLowerCase().includes("engineer")) continue;

    const link =
      `${BASE}?Page=HRS_APP_JBPST_FL&Action=U&FOCUS=Applicant&SiteId=1` +
      `&JobOpeningId=${jobId}&PostingSeq=1`;

    jobs.push({
      jobId,
      title,
      link,
      location: locations.get(row) || undefined,
      firstSeen: new Date().toISOString(),
    });
  }
  return jobs;
}

export const fetchOppdJobs = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching OPPD jobs from PeopleSoft...");

    let jobs: OppdJob[];
    try {
      jobs = await scrapeOppdJobs();
    } catch (error) {
      console.error("Error fetching OPPD jobs:", error);
      return { status: "error", message: String(error) };
    }

    console.log(`Found ${jobs.length} OPPD jobs matching criteria`);

    if (jobs.length > 0) {
      const newJobs: { title: string; link: string; location?: string }[] =
        await ctx.runMutation(internal.oppd.saveOppdJobs, { jobs });

      if (newJobs.length > 0) {
        console.log(`🎉 Found ${newJobs.length} NEW OPPD job(s)!`);
        await ctx.runAction(internal.email.sendNewJobsEmail, {
          company: "OPPD",
          jobs: newJobs,
        });
      } else {
        console.log("✅ No new OPPD jobs (all jobs already tracked)");
      }

      return { status: "success", jobsFound: jobs.length, newJobs: newJobs.length };
    }

    console.log("✅ No OPPD jobs found");
    return { status: "success", jobsFound: 0, newJobs: 0 };
  },
});

export const saveOppdJobs = internalMutation({
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
        .query("oppdJobs")
        .withIndex("by_jobId", (q) => q.eq("jobId", job.jobId))
        .first();
      if (!existing) {
        await ctx.db.insert("oppdJobs", job);
        newJobs.push({ title: job.title, link: job.link, location: job.location });
        console.log(`New OPPD Job found: ${job.title} - ${job.link}`);
      }
    }
    return newJobs;
  },
});

export const getJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("oppdJobs").order("desc").collect();
  },
});

export const clearAllJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const jobs = await ctx.db.query("oppdJobs").collect();
    for (const job of jobs) await ctx.db.delete(job._id);
    console.log(`Deleted ${jobs.length} OPPD jobs`);
    return jobs.length;
  },
});
