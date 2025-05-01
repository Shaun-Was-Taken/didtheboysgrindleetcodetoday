import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addSubmission = mutation({
  args: {
    userId: v.string(),
    problemTitle: v.string(),
    submissionDate: v.string(),
    screenshotUrl: v.string(),
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const submissionId = await ctx.db.insert("leetcodeSubmissions", {
      userId: args.userId,
      problemTitle: args.problemTitle,
      submissionDate: args.submissionDate,
      screenshotUrl: args.screenshotUrl,
      difficulty: args.difficulty,
    });
    return submissionId;
  },
});

export const getSubmissionsByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leetcodeSubmissions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getSubmissionDates = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("leetcodeSubmissions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return submissions.map((sub) => sub.submissionDate);
  },
});

export const getAllSubmissions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("leetcodeSubmissions").collect();
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    // Get unique user IDs from submissions
    const submissions = await ctx.db.query("leetcodeSubmissions").collect();

    // Extract unique user IDs
    const userIds = [...new Set(submissions.map((sub) => sub.userId))];

    return userIds;
  },
});
