import { internalAction } from "./_generated/server";
import { isSoftwareEngineer, looksSoftwareish } from "./jobFetchers";

// Periodic filter audit.
//
// Every fetcher narrows a fuzzy source result-set down to software roles via the
// shared `isSoftwareEngineer` predicate. If a company titles its roles in a way
// the predicate doesn't expect (e.g. Garmin's "Software Engineer 1/2"-only or
// T-Mobile's inverted "Engineer, Software"), real postings get dropped silently.
//
// This action re-fetches each keyword source's RAW titles, applies the predicate,
// and reports any "suspicious drops" — titles that look software-ish
// (`looksSoftwareish`) but the predicate rejected. A non-empty list is the early
// warning that a filter has gone too narrow; check the logs / return value.

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

// Full-board sweep (empty searchText), mirroring fetchWorkdayJobs: keyword
// search misses real SWE titles, and `total` is only reported on the first
// page (later pages say 0 — trusting it capped every sweep at 40 postings).
async function rawWorkdayTitles(opts: {
  tenant: string;
  host: string;
  site: string;
  appliedFacets?: Record<string, string[]>;
  maxPages?: number;
}): Promise<string[]> {
  const { tenant, host, site, appliedFacets = {}, maxPages = 100 } = opts;
  const api = `https://${tenant}.${host}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
  const titles: string[] = [];
  let offset = 0;
  const limit = 20;
  let total: number | null = null;
  for (let page = 0; page < maxPages; page++) {
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        appliedFacets,
        limit,
        offset,
        searchText: "",
      }),
    });
    if (!res.ok) break;
    const data = await res.json();
    const postings = data.jobPostings || [];
    if (total === null) total = Number(data.total ?? 0);
    if (postings.length === 0) break;
    for (const p of postings) titles.push(p.title || "");
    offset += limit;
    if (offset >= total) break;
  }
  return titles;
}

// Google careers HTML, both sweeps (main + intern-targeted), titles from slugs.
async function rawGoogleTitles(): Promise<string[]> {
  const titles: string[] = [];
  const seen = new Set<string>();
  const SEARCHES = [
    "?q=software%20engineer&location=United%20States",
    "?q=software%20engineer&location=United%20States&target_level=INTERN_AND_APPRENTICE",
  ];
  for (const search of SEARCHES) {
    for (let page = 1; page <= 5; page++) {
      const res = await fetch(
        `https://www.google.com/about/careers/applications/jobs/results/${search}&page=${page}`,
        { headers: { "User-Agent": BROWSER_UA, Accept: "text/html" } }
      );
      if (!res.ok) break;
      const htmlText = await res.text();
      const matches = [...htmlText.matchAll(/jobs\/results\/(\d+)-([a-z0-9-]+)/g)];
      if (matches.length === 0) break;
      let newOnPage = 0;
      for (const [, id, slug] of matches) {
        if (seen.has(id)) continue;
        seen.add(id);
        newOnPage++;
        titles.push(slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
      }
      if (newOnPage === 0) break;
    }
  }
  return titles;
}

// Amazon software-development category, newest 300, no job_type/keyword
// narrowing (job_type=Full-Time silently excluded all SDE internships).
async function rawAmazonTitles(): Promise<string[]> {
  const titles: string[] = [];
  for (const offset of [0, 100, 200]) {
    const res = await fetch(
      `https://amazon.jobs/en/search.json?offset=${offset}&result_limit=100&sort=recent&category%5B%5D=software-development&country%5B%5D=USA`,
      { headers: { "User-Agent": BROWSER_UA, Accept: "application/json" } }
    );
    if (!res.ok) break;
    const data = await res.json();
    const jobs = data.jobs || [];
    if (jobs.length === 0) break;
    for (const j of jobs) titles.push(j.title || "");
  }
  return titles;
}

// Apple Software & Services + Students teams (interns live under Students).
async function rawAppleTitles(maxPages = 5): Promise<string[]> {
  const titles: string[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch("https://jobs.apple.com/api/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": BROWSER_UA,
        Referer: "https://jobs.apple.com/en-us/search",
      },
      body: JSON.stringify({
        query: "",
        filters: {
          teams: [
            { team: "teamsAndSubTeams-SFTWR" },
            { team: "teamsAndSubTeams-STDNT" },
          ],
        },
        page,
        locale: "en-us",
        sort: "newest",
        format: { longDate: "MMMM D, YYYY", mediumDate: "MMM D, YYYY" },
      }),
    });
    if (!res.ok) break;
    const data = await res.json();
    const postings = data.res?.searchResults || [];
    if (postings.length === 0) break;
    for (const p of postings) titles.push(p.postingTitle || "");
  }
  return titles;
}

async function rawGreenhouseTitles(board: string): Promise<string[]> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.jobs || []).map((j: { title: string }) => j.title || "");
}

async function rawGarminTitles(maxPages = 10): Promise<string[]> {
  const titles: string[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(
      `https://careers.garmin.com/api/jobs?keywords=Software%20Engineer&sortBy=relevance&page=${page}`
    );
    if (!res.ok) break;
    const data = await res.json();
    const jobs = data.jobs || [];
    if (jobs.length === 0) break;
    for (const j of jobs) titles.push((j.data && j.data.title) || "");
  }
  return titles;
}

// Newest ~50 Microsoft SWE-profession titles (page size is server-capped at 10
// and rapid requests get rate-limited, so this samples with pacing).
async function rawMicrosoftTitles(maxPages = 5): Promise<string[]> {
  const titles: string[] = [];
  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      domain: "microsoft.com",
      filter_profession: "Software Engineering",
      location: "United States",
      start: String(page * 10),
      num: "10",
      sort_by: "timestamp",
    });
    const res = await fetch(
      `https://apply.careers.microsoft.com/api/pcsx/search?${params.toString()}`,
      { headers: { Accept: "application/json", "User-Agent": BROWSER_UA } }
    );
    if (!res.ok) break;
    let data;
    try {
      data = JSON.parse(await res.text());
    } catch {
      break; // rate-limited (empty 200 body)
    }
    const positions = data.data?.positions || [];
    if (positions.length === 0) break;
    for (const p of positions) titles.push(p.name || "");
    await new Promise((r) => setTimeout(r, 1500));
  }
  return titles;
}

// Newest ~50 Netflix titles from the open Eightfold API (page size capped at 10).
async function rawNetflixTitles(maxPages = 5): Promise<string[]> {
  const titles: string[] = [];
  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      domain: "netflix.com",
      query: "software engineer",
      location: "United States",
      start: String(page * 10),
      num: "10",
      sort_by: "timestamp",
    });
    const res = await fetch(
      `https://explore.jobs.netflix.net/api/apply/v2/jobs?${params.toString()}`,
      { headers: { Accept: "application/json", "User-Agent": BROWSER_UA } }
    );
    if (!res.ok) break;
    const data = await res.json();
    const positions = data.positions || [];
    if (positions.length === 0) break;
    for (const p of positions) titles.push(p.name || "");
    await new Promise((r) => setTimeout(r, 800));
  }
  return titles;
}

async function rawUberTitles(): Promise<string[]> {
  const res = await fetch(
    "https://www.uber.com/api/loadSearchJobsResults?localeCode=en",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-csrf-token": "x",
        "User-Agent": BROWSER_UA,
      },
      body: JSON.stringify({
        params: { query: "", location: [{ country: "USA" }], limit: 2000, page: 0 },
      }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data?.results || []).map((j: { title: string }) => j.title || "");
}

async function rawAtlassianTitles(): Promise<string[]> {
  const res = await fetch(
    "https://www.atlassian.com/endpoint/careers/listings",
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) return [];
  const jobs = await res.json();
  return (jobs || []).map((j: { title: string }) => j.title || "");
}

async function rawGMTitles(maxPages = 3): Promise<string[]> {
  const titles: string[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = `https://search-careers.gm.com/en/jobs/?search=software+engineer&country=United+States+of+America&pagesize=50&page=${page}`;
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
    });
    if (!res.ok) break;
    const html = await res.text();
    const matches = [
      ...html.matchAll(
        /<a class="stretched-link" href="\/en\/jobs\/jr-\d+\/[^"]*"\s*>([\s\S]*?)<\/a>/gi
      ),
    ];
    if (matches.length === 0) break;
    for (const m of matches) {
      titles.push(
        m[1].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()
      );
    }
  }
  return titles;
}

async function rawHRBlockTitles(maxPages = 3): Promise<string[]> {
  const titles: string[] = [];
  for (let page = 0; page < maxPages; page++) {
    const url = `https://careers-hrblock.icims.com/jobs/search?ss=1&searchKeyword=software+engineer&pr=${page}&in_iframe=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
    });
    if (!res.ok) break;
    const html = await res.text();
    const matches = [...html.matchAll(/<h3[^>]*>\s*([\s\S]*?)<\/h3>/gi)];
    if (matches.length === 0) break;
    for (const m of matches) {
      titles.push(m[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());
    }
  }
  return titles;
}

// Each source yields its RAW (pre-filter) candidate titles.
const SOURCES: { company: string; getTitles: () => Promise<string[]> }[] = [
  { company: "Garmin", getTitles: () => rawGarminTitles() },
  {
    company: "T-Mobile",
    getTitles: () =>
      rawWorkdayTitles({ tenant: "tmobile", host: "wd1", site: "External" }),
  },
  {
    company: "NVIDIA",
    getTitles: () =>
      rawWorkdayTitles({
        tenant: "nvidia",
        host: "wd5",
        site: "NVIDIAExternalCareerSite",
        appliedFacets: { locationHierarchy1: ["2fcb99c455831013ea52fb338f2932d8"] },
      }),
  },
  {
    company: "Salesforce",
    getTitles: () =>
      rawWorkdayTitles({
        tenant: "salesforce",
        host: "wd12",
        site: "External_Career_Site",
        appliedFacets: {
          "CF_-_REC_-_LRV_-_Job_Posting_Anchor_-_Country_from_Job_Posting_Location_Extended":
            ["bc33aa3152ec42d4995f4791a106ed09"],
        },
      }),
  },
  {
    company: "WellSky",
    getTitles: () =>
      rawWorkdayTitles({ tenant: "wellsky", host: "wd1", site: "WellSkyCareers" }),
  },
  {
    company: "Netsmart",
    getTitles: () =>
      rawWorkdayTitles({
        tenant: "ntst",
        host: "wd1",
        site: "Careers",
        appliedFacets: {
          locations: [
            "d5ce43d260f1019c84e96ea1c8c74f78",
            "7d657dc447c4105a4a48b01fadf82acc",
          ],
        },
      }),
  },
  { company: "Stripe", getTitles: () => rawGreenhouseTitles("stripe") },
  { company: "Databricks", getTitles: () => rawGreenhouseTitles("databricks") },
  { company: "Anthropic", getTitles: () => rawGreenhouseTitles("anthropic") },
  { company: "Pinterest", getTitles: () => rawGreenhouseTitles("pinterest") },
  { company: "Airbnb", getTitles: () => rawGreenhouseTitles("airbnb") },
  { company: "Datadog", getTitles: () => rawGreenhouseTitles("datadog") },
  { company: "Duolingo", getTitles: () => rawGreenhouseTitles("duolingo") },
  { company: "Discord", getTitles: () => rawGreenhouseTitles("discord") },
  { company: "Roblox", getTitles: () => rawGreenhouseTitles("roblox") },
  { company: "DoorDash", getTitles: () => rawGreenhouseTitles("doordashusa") },
  { company: "Coinbase", getTitles: () => rawGreenhouseTitles("coinbase") },
  { company: "Netflix", getTitles: () => rawNetflixTitles() },
  {
    company: "Adobe",
    getTitles: () =>
      rawWorkdayTitles({
        tenant: "adobe",
        host: "wd5",
        site: "external_experienced",
        appliedFacets: {
          locationCountry: ["bc33aa3152ec42d4995f4791a106ed09"],
        },
      }),
  },
  { company: "Uber", getTitles: () => rawUberTitles() },
  { company: "Microsoft", getTitles: () => rawMicrosoftTitles() },
  { company: "Google", getTitles: () => rawGoogleTitles() },
  { company: "Amazon", getTitles: () => rawAmazonTitles() },
  { company: "Apple", getTitles: () => rawAppleTitles() },
  { company: "Atlassian", getTitles: () => rawAtlassianTitles() },
  { company: "GM", getTitles: () => rawGMTitles() },
  { company: "H&R Block", getTitles: () => rawHRBlockTitles() },
];

export const auditFilters = internalAction({
  args: {},
  handler: async () => {
    console.log("🔎 Running job-filter audit...");

    const report: {
      company: string;
      raw: number;
      kept: number;
      suspiciousDrops: string[];
      error?: string;
    }[] = [];

    for (const src of SOURCES) {
      try {
        const titles = await src.getTitles();
        const kept = titles.filter((t) => isSoftwareEngineer(t));
        // Software-ish titles the predicate rejected → likely missed postings.
        const suspicious = [
          ...new Set(
            titles.filter((t) => looksSoftwareish(t) && !isSoftwareEngineer(t))
          ),
        ];
        report.push({
          company: src.company,
          raw: titles.length,
          kept: kept.length,
          suspiciousDrops: suspicious,
        });

        const line = `  ${src.company}: ${titles.length} raw → ${kept.length} kept`;
        if (suspicious.length > 0) {
          console.warn(
            `⚠️ ${line} — ${suspicious.length} suspicious drop(s): ${suspicious
              .slice(0, 15)
              .join(" | ")}`
          );
        } else {
          console.log(`✅ ${line}`);
        }
      } catch (error) {
        console.error(`❌ ${src.company} audit failed:`, error);
        report.push({
          company: src.company,
          raw: 0,
          kept: 0,
          suspiciousDrops: [],
          error: String(error),
        });
      }
    }

    const flagged = report.filter((r) => r.suspiciousDrops.length > 0);
    console.log(
      `🔎 Audit complete. ${flagged.length} compan${
        flagged.length === 1 ? "y" : "ies"
      } with suspicious drops.`
    );

    return { flaggedCount: flagged.length, report };
  },
});
