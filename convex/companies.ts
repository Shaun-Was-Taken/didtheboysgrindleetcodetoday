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
  { name: "Pinterest", domain: "pinterest.com" },
  { name: "Airbnb", domain: "airbnb.com" },
  { name: "Datadog", domain: "datadoghq.com" },
  { name: "Duolingo", domain: "duolingo.com" },
  { name: "Discord", domain: "discord.com" },
] as const;

export const TRACKED_COMPANY_NAMES: string[] = TRACKED_COMPANIES.map(
  (c) => c.name
);

/**
 * Companies tracked for the site owner personally. Their boards, landing-page
 * logos, alert toggles, and job data are hidden from everyone else.
 */
export const OWNER_EMAIL = "ssubat0628@gmail.com";
export const PRIVATE_COMPANY_NAMES: string[] = [
  "Garmin",
  "WellSky",
  "OPPD",
  "H&R Block",
  "Netsmart",
];

export function isPrivateCompany(name: string): boolean {
  return PRIVATE_COMPANY_NAMES.includes(name);
}

/** Company names visible to a given user (owner sees everything). */
export function visibleCompanyNames(isOwner: boolean): string[] {
  return isOwner
    ? TRACKED_COMPANY_NAMES
    : TRACKED_COMPANY_NAMES.filter((c) => !isPrivateCompany(c));
}
