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
});
