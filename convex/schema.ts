import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Add your tables here
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    stripeCustomerID: v.string(),
    credit: v.number(),
    stripeSubscriptionID: v.string(),
    stripeSubscriptionStatus: v.string(),
    imageUrl: v.string(),
    // LeetCode auto-sync (Phase 1): poll the public API for this username.
    leetcodeUsername: v.optional(v.string()),
    leetcodeVerified: v.optional(v.boolean()), // ownership proven (fast-follow)
    lastLeetcodeSyncAt: v.optional(v.number()), // unix ms heartbeat
    // Personal daily problem goal; only applies when not in a group.
    dailyGoal: v.optional(v.number()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_stripe_customer_id", ["stripeCustomerID"])
    .index("by_leetcodeUsername", ["leetcodeUsername"]),

  leetcodeSubmissions: defineTable({
    userId: v.string(),
    problemTitle: v.string(),
    submissionDate: v.string(),
    screenshotUrl: v.optional(v.string()), // optional: synced solves have no image
    difficulty: v.optional(v.string()),
    titleSlug: v.optional(v.string()),
    source: v.optional(v.string()), // "leetcode" | "screenshot"
    externalId: v.optional(v.string()), // LeetCode submission id (dedupe key)
  })
    .index("by_userId", ["userId"])
    .index("by_date", ["submissionDate"])
    .index("by_user_externalId", ["userId", "externalId"])
    .index("by_user_slug_date", ["userId", "titleSlug", "submissionDate"]),

  // Cache of slug -> difficulty so we don't re-fetch the LeetCode API per solve.
  leetcodeProblems: defineTable({
    titleSlug: v.string(),
    title: v.string(),
    difficulty: v.string(),
  }).index("by_slug", ["titleSlug"]),

  dailyCompletions: defineTable({
    userId: v.string(),
    date: v.string(), // Format: YYYY-MM-DD
    count: v.number(),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_date", ["date"]),

  garminJobs: defineTable({
    jobId: v.string(),
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  amazonJobs: defineTable({
    jobId: v.string(), // job_path from Amazon API
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  microsoftJobs: defineTable({
    jobId: v.string(), // Adzuna job ID
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  atlassianJobs: defineTable({
    jobId: v.string(),
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  wellskyJobs: defineTable({
    jobId: v.string(), // Workday externalPath
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  tmobileJobs: defineTable({
    jobId: v.string(), // Workday externalPath
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  nvidiaJobs: defineTable({
    jobId: v.string(), // Workday externalPath
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  salesforceJobs: defineTable({
    jobId: v.string(), // Workday externalPath
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  stripeJobs: defineTable({
    jobId: v.string(), // Greenhouse job id
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  databricksJobs: defineTable({
    jobId: v.string(), // Greenhouse job id
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  googleJobs: defineTable({
    jobId: v.string(), // Google careers job id
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  appleJobs: defineTable({
    jobId: v.string(), // Apple positionId
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  openaiJobs: defineTable({
    jobId: v.string(), // Ashby job id
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  anthropicJobs: defineTable({
    jobId: v.string(), // Greenhouse job id
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  pinterestJobs: defineTable({
    jobId: v.string(), // Greenhouse job id
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  airbnbJobs: defineTable({
    jobId: v.string(), // Greenhouse job id
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  datadogJobs: defineTable({
    jobId: v.string(), // Greenhouse job id
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  oppdJobs: defineTable({
    jobId: v.string(), // PeopleSoft JobOpeningId
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  hrblockJobs: defineTable({
    jobId: v.string(), // iCIMS numeric job id
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  netsmartJobs: defineTable({
    jobId: v.string(), // Workday externalPath
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  gmJobs: defineTable({
    jobId: v.string(), // GM careers req id (jr-XXXXXXXXX)
    title: v.string(),
    link: v.string(),
    location: v.optional(v.string()),
    firstSeen: v.string(),
  }).index("by_jobId", ["jobId"]),

  // Friend groups for private LeetCode accountability leaderboards.
  groups: defineTable({
    name: v.string(),
    ownerId: v.string(), // clerkId of the owner
    inviteCode: v.string(),
    createdAt: v.string(),
    // Owner-set daily problem goal for every member (default 2 when unset).
    dailyGoal: v.optional(v.number()),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_inviteCode", ["inviteCode"]),

  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.string(), // clerkId
    joinedAt: v.string(),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_user", ["groupId", "userId"]),

  // Premium job alerts are default-on; a row here means the user MUTED that
  // company's alerts (see convex/jobAlerts.ts).
  jobAlerts: defineTable({
    userId: v.string(), // clerkId
    company: v.string(), // display/company name, e.g. "Apple"
    email: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_company", ["company"])
    .index("by_user_company", ["userId", "company"]),
});
