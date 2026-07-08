import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

// Screenshot/file uploads were removed (abuse risk) — manual submissions are
// text-only. The caller's identity comes from auth, never from an argument.

// Manual solves a single user can log per day before we assume spam.
const MANUAL_DAILY_CAP = 25;

export const addSubmission = mutation({
  args: {
    problemTitle: v.string(),
    submissionDate: v.string(),
    difficulty: v.optional(
      v.union(v.literal("Easy"), v.literal("Medium"), v.literal("Hard"))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("You must be signed in.");
    const userId = identity.subject;

    const problemTitle = args.problemTitle.trim();
    if (problemTitle.length < 3 || problemTitle.length > 120) {
      throw new ConvexError("Problem title must be 3-120 characters.");
    }

    // The client sends its Central-time "today" (see src/lib/today.ts); accept
    // only dates within a day of server UTC time so solves can't be backdated.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.submissionDate)) {
      throw new ConvexError("Invalid date.");
    }
    const dayMs = 24 * 60 * 60 * 1000;
    const sent = Date.parse(`${args.submissionDate}T00:00:00Z`);
    if (Number.isNaN(sent) || Math.abs(sent - Date.now()) > 2 * dayMs) {
      throw new ConvexError("Submission date must be today.");
    }

    const sameDay = (
      await ctx.db
        .query("leetcodeSubmissions")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect()
    ).filter((s) => s.submissionDate === args.submissionDate);
    if (sameDay.length >= MANUAL_DAILY_CAP) {
      throw new ConvexError("Daily submission limit reached.");
    }
    // Re-logging the same problem on the same day is a no-op.
    if (
      sameDay.some(
        (s) => s.problemTitle.toLowerCase() === problemTitle.toLowerCase()
      )
    ) {
      throw new ConvexError("You already logged that problem today.");
    }

    const submissionId = await ctx.db.insert("leetcodeSubmissions", {
      userId,
      problemTitle,
      submissionDate: args.submissionDate,
      difficulty: args.difficulty,
      source: "manual",
    });

    const existingCompletion = await ctx.db
      .query("dailyCompletions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.submissionDate)
      )
      .unique();
    if (existingCompletion) {
      await ctx.db.patch(existingCompletion._id, {
        count: existingCompletion.count + 1,
      });
    } else {
      await ctx.db.insert("dailyCompletions", {
        userId,
        date: args.submissionDate,
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
