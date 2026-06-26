"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Node runtime: needed for full Intl timezone support (Central-time day math).

const LC_GRAPHQL = "https://leetcode.com/graphql";
const LC_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Referer: "https://leetcode.com",
};

const APP_TZ = "America/Chicago";
const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
/** Unix seconds -> "YYYY-MM-DD" in the app's canonical timezone (US Central). */
function unixToDate(unixSeconds: number): string {
  return dateFmt.format(new Date(unixSeconds * 1000)); // en-CA -> ISO-ish YYYY-MM-DD
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gql(query: string, variables: Record<string, unknown>) {
  const res = await fetch(LC_GRAPHQL, {
    method: "POST",
    headers: LC_HEADERS,
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 429) throw new Error("LeetCode rate limit (429)");
  if (!res.ok) throw new Error(`LeetCode HTTP ${res.status}`);
  return (await res.json()) as { data?: any; errors?: any };
}

type RecentAc = {
  id: string;
  title: string;
  titleSlug: string;
  timestamp: string;
};

async function fetchRecentAc(
  username: string,
  limit = 20
): Promise<RecentAc[]> {
  const json = await gql(
    `query($u:String!,$n:Int!){recentAcSubmissionList(username:$u,limit:$n){id title titleSlug timestamp}}`,
    { u: username, n: limit }
  );
  return (json.data?.recentAcSubmissionList ?? []) as RecentAc[];
}

async function fetchDifficulty(
  slug: string
): Promise<{ title: string; difficulty: string } | null> {
  const json = await gql(
    `query($s:String!){question(titleSlug:$s){title difficulty}}`,
    { s: slug }
  );
  const q = json.data?.question;
  return q?.difficulty ? { title: q.title, difficulty: q.difficulty } : null;
}

/**
 * Sync one user. `cache` is a per-run slug->difficulty memo (string = known,
 * null = looked up and unknown/failed) so repeated slugs across users in the
 * same tick don't re-query the DB or re-hit the API.
 */
async function syncUser(
  ctx: any,
  clerkId: string,
  username: string,
  cache: Map<string, string | null>
): Promise<number> {
  const subs = await fetchRecentAc(username, 20);
  if (subs.length === 0) {
    await ctx.runMutation(internal.leetcodeSync.ingest, {
      userId: clerkId,
      syncedAt: Date.now(),
      subs: [],
    });
    return 0;
  }

  const slugs = [...new Set(subs.map((s) => s.titleSlug))];

  // Seed from the DB cache for slugs we haven't seen this run.
  const needDbLookup = slugs.filter((s) => !cache.has(s));
  if (needDbLookup.length > 0) {
    const known = await ctx.runQuery(internal.leetcodeSync.getDifficulties, {
      slugs: needDbLookup,
    });
    for (const k of known as { slug: string; difficulty: string }[]) {
      cache.set(k.slug, k.difficulty);
    }
    for (const s of needDbLookup) if (!cache.has(s)) cache.set(s, null);
  }

  // Fetch difficulty from the API for anything still unknown.
  const toFetch = slugs.filter((s) => cache.get(s) == null);
  const newlyCached: { slug: string; title: string; difficulty: string }[] = [];
  for (const slug of toFetch) {
    try {
      const d = await fetchDifficulty(slug);
      if (d) {
        cache.set(slug, d.difficulty);
        newlyCached.push({ slug, title: d.title, difficulty: d.difficulty });
      }
    } catch {
      /* leave null; difficulty is best-effort */
    }
    await sleep(150);
  }
  if (newlyCached.length > 0) {
    await ctx.runMutation(internal.leetcodeSync.cacheDifficulties, {
      items: newlyCached,
    });
  }

  const payload = subs.map((s) => ({
    externalId: s.id,
    title: s.title,
    titleSlug: s.titleSlug,
    submissionDate: unixToDate(Number(s.timestamp)),
    difficulty: (cache.get(s.titleSlug) ?? null) as string | null,
  }));

  return (await ctx.runMutation(internal.leetcodeSync.ingest, {
    userId: clerkId,
    syncedAt: Date.now(),
    subs: payload,
  })) as number;
}

/** Cron entrypoint — sync every linked user, throttled to stay friendly. */
export const syncAllUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = (await ctx.runQuery(
      internal.leetcodeSync.usersToSync
    )) as { clerkId: string; leetcodeUsername: string }[];

    const cache = new Map<string, string | null>();
    let totalNew = 0;
    for (const u of users) {
      try {
        totalNew += await syncUser(ctx, u.clerkId, u.leetcodeUsername, cache);
      } catch (e) {
        console.error(`LeetCode sync failed for ${u.leetcodeUsername}:`, e);
      }
      await sleep(300);
    }
    console.log(
      `LeetCode sync: ${users.length} user(s), ${totalNew} new submission(s)`
    );
    return { users: users.length, newSubmissions: totalNew };
  },
});

/** One-off sync, scheduled right after a user links their username. */
export const syncOne = internalAction({
  args: { clerkId: v.string(), username: v.string() },
  handler: async (ctx, { clerkId, username }) => {
    const cache = new Map<string, string | null>();
    try {
      const n = await syncUser(ctx, clerkId, username, cache);
      return { newSubmissions: n };
    } catch (e) {
      console.error(`LeetCode syncOne failed for ${username}:`, e);
      return { newSubmissions: 0 };
    }
  },
});
