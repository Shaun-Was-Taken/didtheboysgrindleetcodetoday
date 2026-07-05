/**
 * Canonical list of tracked companies — the single source of truth shared by
 * the Convex backend (alert defaults) and the Next.js frontend (alert UI).
 * The `name` strings must exactly match the `company` passed to
 * internal.email.sendNewJobsEmail by each fetcher.
 */
export const TRACKED_COMPANIES = [
  { name: "Garmin", domain: "garmin.com" },
  { name: "Amazon", domain: "amazon.com" },
  { name: "Microsoft", domain: "microsoft.com" },
  { name: "Atlassian", domain: "atlassian.com" },
  { name: "WellSky", domain: "wellsky.com" },
  { name: "T-Mobile", domain: "t-mobile.com" },
  { name: "Google", domain: "google.com" },
  { name: "NVIDIA", domain: "nvidia.com" },
  { name: "Salesforce", domain: "salesforce.com" },
  { name: "Stripe", domain: "stripe.com" },
  { name: "Databricks", domain: "databricks.com" },
  { name: "Apple", domain: "apple.com" },
  { name: "OpenAI", domain: "openai.com" },
  { name: "Anthropic", domain: "anthropic.com" },
  { name: "OPPD", domain: "oppd.com" },
  { name: "H&R Block", domain: "hrblock.com" },
  { name: "Netsmart", domain: "ntst.com" },
  { name: "GM", domain: "gm.com" },
] as const;

export const TRACKED_COMPANY_NAMES: string[] = TRACKED_COMPANIES.map(
  (c) => c.name
);
