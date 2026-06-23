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
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_stripe_customer_id", ["stripeCustomerID"]),

  leetcodeSubmissions: defineTable({
    userId: v.string(),
    problemTitle: v.string(),
    submissionDate: v.string(),
    screenshotUrl: v.string(),
    difficulty: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_date", ["submissionDate"]),

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

  // Friend groups for private LeetCode accountability leaderboards.
  groups: defineTable({
    name: v.string(),
    ownerId: v.string(), // clerkId of the owner
    inviteCode: v.string(),
    createdAt: v.string(),
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

  // Premium-only per-company job alert subscriptions.
  jobAlerts: defineTable({
    userId: v.string(), // clerkId
    company: v.string(), // display/company name, e.g. "Apple"
    email: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_company", ["company"])
    .index("by_user_company", ["userId", "company"]),
});
