import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const generateUploadUrl = mutation({
  args: {
    // We don't need arguments for this mutation since we're just generating an upload URL
  },
  handler: async (ctx) => {
    // Use Convex's storage to generate a unique URL for file uploads
    return await ctx.storage.generateUploadUrl();
  },
});

export const getUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const saveScreenshot = mutation({
  args: {
    storageId: v.string(),
    userId: v.string(),
    problemTitle: v.string(),
    submissionDate: v.string(),
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify that the file exists in storage
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) {
      throw new ConvexError("File does not exist in storage");
    }

    // Save the submission to the database
    const submissionId = await ctx.db.insert("leetcodeSubmissions", {
      userId: args.userId,
      problemTitle: args.problemTitle,
      submissionDate: args.submissionDate,
      screenshotUrl: fileUrl,
      difficulty: args.difficulty,
    });

    return { submissionId, fileUrl };
  },
});