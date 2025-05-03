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

    // Update daily completion count
    const todayDate = args.submissionDate; // Assuming submissionDate is YYYY-MM-DD
    const existingCompletion = await ctx.db
      .query("dailyCompletions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", todayDate)
      )
      .unique();

    if (existingCompletion) {
      await ctx.db.patch(existingCompletion._id, {
        count: existingCompletion.count + 1,
      });
    } else {
      await ctx.db.insert("dailyCompletions", {
        userId: args.userId,
        date: todayDate,
        count: 1,
      });
    }

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

export const getDailyCompletions = query({
  args: { date: v.string() }, // Expecting date in YYYY-MM-DD format
  handler: async (ctx, args) => {
    // 1. Fetch all registered users
    const allUsers = await ctx.db.query("users").collect();

    // 2. Fetch completions for the specified date
    const completionsToday = await ctx.db
      .query("dailyCompletions")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();

    // 3. Create a map of completions for quick lookup
    const completionsMap = new Map(
      completionsToday.map((comp) => [comp.userId, comp.count])
    );

    // 4. Merge all users with their completion data (or default to 0)
    const leaderboardData = allUsers.map((user) => {
      const count = completionsMap.get(user.clerkId) || 0;
      return {
        userId: user.clerkId,
        userName: user.name,
        userImage: user.imageUrl,
        count: count,
        date: args.date, // Include the date for consistency if needed
        // You might not need _id and _creationTime from dailyCompletions here
      };
    });

    return leaderboardData;
  },
});
