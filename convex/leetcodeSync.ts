import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ---------------------------------------------------------------------------
// LeetCode auto-sync — Phase 1
//
// A cron polls LeetCode's public GraphQL `recentAcSubmissionList` per user
// (see leetcodeSyncNode.ts for the fetch/date side, which needs the Node
// runtime for Intl timezone support). This file holds the DB-side queries and
// mutations plus the username-link action.
// ---------------------------------------------------------------------------

const LC_GRAPHQL = "https://leetcode.com/graphql";
const LC_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Referer: "https://leetcode.com",
};

/** Users that have linked a LeetCode username — the polling set. */
export const usersToSync = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.leetcodeUsername && u.leetcodeUsername.trim().length > 0)
      .map((u) => ({
        clerkId: u.clerkId,
        leetcodeUsername: u.leetcodeUsername as string,
      }));
  },
});

/** Cached difficulties for the given slugs (only returns ones we know). */
export const getDifficulties = internalQuery({
  args: { slugs: v.array(v.string()) },
  handler: async (ctx, { slugs }) => {
    const out: { slug: string; difficulty: string }[] = [];
    for (const slug of slugs) {
      const row = await ctx.db
        .query("leetcodeProblems")
        .withIndex("by_slug", (q) => q.eq("titleSlug", slug))
        .unique();
      if (row) out.push({ slug, difficulty: row.difficulty });
    }
    return out;
  },
});

/** Persist newly-resolved slug -> difficulty entries. */
export const cacheDifficulties = internalMutation({
  args: {
    items: v.array(
      v.object({
        slug: v.string(),
        title: v.string(),
        difficulty: v.string(),
      })
    ),
  },
  handler: async (ctx, { items }) => {
    for (const it of items) {
      const existing = await ctx.db
        .query("leetcodeProblems")
        .withIndex("by_slug", (q) => q.eq("titleSlug", it.slug))
        .unique();
      if (!existing) {
        await ctx.db.insert("leetcodeProblems", {
          titleSlug: it.slug,
          title: it.title,
          difficulty: it.difficulty,
        });
      }
    }
  },
});

/**
 * Ingest a batch of accepted submissions for one user. Dedupes by the LeetCode
 * submission id, and counts the daily goal as DISTINCT problems per day (a
 * re-solve of the same problem on the same day doesn't bump the count again).
 */
export const ingest = internalMutation({
  args: {
    userId: v.string(),
    syncedAt: v.number(),
    subs: v.array(
      v.object({
        externalId: v.string(),
        title: v.string(),
        titleSlug: v.string(),
        submissionDate: v.string(),
        difficulty: v.union(v.string(), v.null()),
      })
    ),
  },
  handler: async (ctx, { userId, syncedAt, subs }) => {
    let inserted = 0;

    // Oldest-first so streak/daily math lands in chronological order.
    const ordered = [...subs].sort((a, b) =>
      a.submissionDate < b.submissionDate ? -1 : 1
    );

    for (const s of ordered) {
      const dup = await ctx.db
        .query("leetcodeSubmissions")
        .withIndex("by_user_externalId", (q) =>
          q.eq("userId", userId).eq("externalId", s.externalId)
        )
        .unique();
      if (dup) continue;

      // Is this the first time this problem is solved on this day?
      const sameProblemToday = await ctx.db
        .query("leetcodeSubmissions")
        .withIndex("by_user_slug_date", (q) =>
          q
            .eq("userId", userId)
            .eq("titleSlug", s.titleSlug)
            .eq("submissionDate", s.submissionDate)
        )
        .first();

      await ctx.db.insert("leetcodeSubmissions", {
        userId,
        problemTitle: s.title,
        titleSlug: s.titleSlug,
        submissionDate: s.submissionDate,
        difficulty: s.difficulty ?? undefined,
        source: "leetcode",
        externalId: s.externalId,
      });
      inserted++;

      if (!sameProblemToday) {
        const existing = await ctx.db
          .query("dailyCompletions")
          .withIndex("by_user_date", (q) =>
            q.eq("userId", userId).eq("date", s.submissionDate)
          )
          .unique();
        if (existing) {
          await ctx.db.patch(existing._id, { count: existing.count + 1 });
        } else {
          await ctx.db.insert("dailyCompletions", {
            userId,
            date: s.submissionDate,
            count: 1,
          });
        }
      }
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", userId))
      .unique();
    if (user) await ctx.db.patch(user._id, { lastLeetcodeSyncAt: syncedAt });

    return inserted;
  },
});

/** Store a validated username on the user. */
export const saveUsername = internalMutation({
  args: { clerkId: v.string(), username: v.string() },
  handler: async (ctx, { clerkId, username }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      leetcodeUsername: username,
      leetcodeVerified: false,
    });
  },
});

/** The currently-linked username, for the connect UI. */
export const getLeetcodeUsername = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    return user?.leetcodeUsername ?? null;
  },
});

/** Confirm a username resolves to a real public LeetCode profile. */
async function leetcodeUserExists(username: string): Promise<boolean> {
  try {
    const res = await fetch(LC_GRAPHQL, {
      method: "POST",
      headers: LC_HEADERS,
      body: JSON.stringify({
        query: `query($u:String!){matchedUser(username:$u){username}}`,
        variables: { u: username },
      }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as {
      data?: { matchedUser?: { username?: string } | null };
    };
    return Boolean(json.data?.matchedUser);
  } catch {
    return false;
  }
}

/**
 * Link a LeetCode username: validate it exists (Phase 1 = validation only, no
 * ownership proof yet), save it, and kick off an immediate first sync so the
 * user sees their history right away.
 */
export const setLeetcodeUsername = action({
  args: { clerkId: v.string(), username: v.string() },
  handler: async (ctx, { clerkId, username }) => {
    const clean = username.trim();
    if (!clean) throw new Error("Enter your LeetCode username.");
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(clean)) {
      throw new Error("That doesn't look like a valid LeetCode username.");
    }

    const exists = await leetcodeUserExists(clean);
    if (!exists) {
      throw new Error(
        "No public LeetCode profile found for that username. Check the spelling."
      );
    }

    await ctx.runMutation(internal.leetcodeSync.saveUsername, {
      clerkId,
      username: clean,
    });

    // Immediate first pull (Node action handles fetch + Central-time dates).
    await ctx.scheduler.runAfter(0, internal.leetcodeSyncNode.syncOne, {
      clerkId,
      username: clean,
    });

    return { ok: true, username: clean };
  },
});
