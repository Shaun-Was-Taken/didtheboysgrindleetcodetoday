import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "garmin-job-monitor",
  { hours: 1 },
  internal.garmin.fetchGarminJobs
);

crons.interval(
  "amazon-job-monitor",
  { hours: 1 },
  internal.amazon.fetchAmazonJobs
);

crons.interval(
  "microsoft-job-monitor",
  { hours: 1 },
  internal.microsoft.fetchMicrosoftJobs
);

crons.interval(
  "atlassian-job-monitor",
  { hours: 1 },
  internal.atlassian.fetchAtlassianJobs
);

crons.interval(
  "wellsky-job-monitor",
  { hours: 1 },
  internal.wellsky.fetchWellSkyJobs
);

crons.interval(
  "tmobile-job-monitor",
  { hours: 1 },
  internal.tmobile.fetchTMobileJobs
);

crons.interval(
  "nvidia-job-monitor",
  { hours: 1 },
  internal.nvidia.fetchNvidiaJobs
);

crons.interval(
  "salesforce-job-monitor",
  { hours: 1 },
  internal.salesforce.fetchSalesforceJobs
);

crons.interval(
  "stripe-job-monitor",
  { hours: 1 },
  internal.stripe_jobs.fetchStripeJobs
);

crons.interval(
  "databricks-job-monitor",
  { hours: 1 },
  internal.databricks.fetchDatabricksJobs
);

crons.interval(
  "google-job-monitor",
  { hours: 1 },
  internal.google.fetchGoogleJobsAction
);

crons.interval(
  "apple-job-monitor",
  { hours: 1 },
  internal.apple.fetchAppleJobsAction
);

crons.interval(
  "openai-job-monitor",
  { hours: 1 },
  internal.openai.fetchOpenAIJobs
);

crons.interval(
  "anthropic-job-monitor",
  { hours: 1 },
  internal.anthropic.fetchAnthropicJobs
);

crons.interval(
  "oppd-job-monitor",
  { hours: 1 },
  internal.oppd.fetchOppdJobs
);

crons.interval(
  "hrblock-job-monitor",
  { hours: 1 },
  internal.hrblock.fetchHRBlockJobs
);

crons.interval(
  "netsmart-job-monitor",
  { hours: 1 },
  internal.netsmart.fetchNetsmartJobs
);

crons.interval(
  "gm-job-monitor",
  { hours: 1 },
  internal.gm.fetchGMJobs
);

// Daily audit: flag fetchers whose title filter is silently dropping
// software-ish postings (see convex/jobAudit.ts).
crons.interval(
  "job-filter-audit",
  { hours: 24 },
  internal.jobAudit.auditFilters
);

// Pull each linked user's recent accepted LeetCode solves.
crons.interval(
  "leetcode-sync",
  { minutes: 15 },
  internal.leetcodeSyncNode.syncAllUsers
);

export default crons;
