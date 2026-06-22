// Shared helpers (plain functions, not Convex endpoints) for pulling Software
// Engineer postings from the ATS platforms different companies use.

export interface FetchedJob {
  jobId: string;
  title: string;
  link: string;
  location?: string;
  firstSeen: string;
}

const US_STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
]);

// Full state names — some boards (e.g. Greenhouse) spell out "San Francisco, California".
const US_STATE_NAMES = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
  "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
  "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine",
  "maryland", "massachusetts", "michigan", "minnesota", "mississippi",
  "missouri", "montana", "nebraska", "nevada", "new hampshire", "new jersey",
  "new mexico", "new york", "north carolina", "north dakota", "ohio",
  "oklahoma", "oregon", "pennsylvania", "rhode island", "south carolina",
  "south dakota", "tennessee", "texas", "utah", "vermont", "virginia",
  "washington", "west virginia", "wisconsin", "wyoming",
];

export function isSoftwareEngineer(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes("software engineer") || t.includes("developer");
}

// True when a free-text location string looks like a US location (or US remote).
export function isUsLocation(location: string | undefined): boolean {
  if (!location) return false;
  const l = location.toLowerCase();
  if (l.includes("united states") || l.includes("usa") || l.includes("u.s.")) return true;
  if (l.includes("remote")) return true;
  // Match "City, ST" where ST is a real US state abbreviation.
  const stateMatch = location.match(/\b([A-Z]{2})\b/g);
  if (stateMatch && stateMatch.some((s) => US_STATES.has(s))) return true;
  // Match spelled-out state names, e.g. "San Francisco, California".
  if (US_STATE_NAMES.some((name) => new RegExp(`\\b${name}\\b`).test(l))) return true;
  return false;
}

interface WorkdayPosting {
  title: string;
  externalPath: string;
  locationsText?: string;
}

/** Fetch SWE postings from a Workday CXS job board. */
export async function fetchWorkdayJobs(opts: {
  tenant: string;
  host: string;
  site: string;
  searchText?: string;
  appliedFacets?: Record<string, string[]>;
}): Promise<FetchedJob[]> {
  const { tenant, host, site, searchText = "Software Engineer", appliedFacets = {} } = opts;
  const api = `https://${tenant}.${host}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
  const base = `https://${tenant}.${host}.myworkdayjobs.com/en-US/${site}`;

  const jobs: FetchedJob[] = [];
  const limit = 20;
  let offset = 0;
  const MAX_PAGES = 50;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ appliedFacets, limit, offset, searchText }),
    });
    if (!res.ok) {
      console.error(`Workday ${tenant} fetch failed: ${res.statusText}`);
      break;
    }
    const data = await res.json();
    const postings: WorkdayPosting[] = data.jobPostings || [];
    const total: number = data.total ?? 0;
    if (postings.length === 0) break;

    for (const p of postings) {
      const title = p.title || "Unknown Title";
      if (!isSoftwareEngineer(title)) continue;
      jobs.push({
        jobId: p.externalPath,
        title,
        link: `${base}${p.externalPath}`,
        location: p.locationsText,
        firstSeen: new Date().toISOString(),
      });
    }

    offset += limit;
    if (offset >= total) break;
  }

  return dedupe(jobs);
}

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
}

/** Fetch US SWE postings from a Greenhouse job board. */
export async function fetchGreenhouseJobs(board: string): Promise<FetchedJob[]> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) {
    console.error(`Greenhouse ${board} fetch failed: ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  const all: GreenhouseJob[] = data.jobs || [];

  const jobs: FetchedJob[] = all
    .filter((j) => isSoftwareEngineer(j.title) && isUsLocation(j.location?.name))
    .map((j) => ({
      jobId: String(j.id),
      title: j.title,
      link: j.absolute_url,
      location: j.location?.name,
      firstSeen: new Date().toISOString(),
    }));

  return dedupe(jobs);
}

/**
 * Fetch SWE postings from Google's careers site.
 *
 * Google runs a custom, server-rendered site with no JSON API, so we parse the
 * results HTML. Each posting is linked as `jobs/results/<id>-<title-slug>`,
 * which gives us a stable id and a human title. Per-job location isn't reliably
 * pairable from the flat markup, so location is left empty; the `&location`
 * query biases results toward the US. This tracker is inherently more brittle
 * than the API-based ones above.
 */
export async function fetchGoogleJobs(): Promise<FetchedJob[]> {
  const jobs: FetchedJob[] = [];
  const MAX_PAGES = 5; // 20/page
  const seen = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url =
      "https://www.google.com/about/careers/applications/jobs/results/" +
      `?q=software%20engineer&location=United%20States&page=${page}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
    });
    if (!res.ok) {
      console.error(`Google fetch failed (page ${page}): ${res.statusText}`);
      break;
    }
    const htmlText = await res.text();
    const matches = [...htmlText.matchAll(/jobs\/results\/(\d+)-([a-z0-9-]+)/g)];
    if (matches.length === 0) break;

    let newOnPage = 0;
    for (const m of matches) {
      const [, id, slug] = m;
      if (seen.has(id)) continue;
      seen.add(id);
      newOnPage++;
      const title = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      if (!isSoftwareEngineer(title)) continue;
      jobs.push({
        jobId: id,
        title,
        link: `https://www.google.com/about/careers/applications/jobs/results/${id}-${slug}`,
        firstSeen: new Date().toISOString(),
      });
    }
    if (newOnPage === 0) break;
  }

  return dedupe(jobs);
}

function dedupe(jobs: FetchedJob[]): FetchedJob[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    if (seen.has(j.jobId)) return false;
    seen.add(j.jobId);
    return true;
  });
}
