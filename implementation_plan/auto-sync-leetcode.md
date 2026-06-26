# Auto-syncing LeetCode / NeetCode solves (no screenshots)

> **STATUS — Phase 1 DEPLOYED & LIVE (verified).** Deployed via `npx convex dev`
> and confirmed working end-to-end: linked username `subatQ` on `/upload`, the
> immediate sync pulled recent accepted solves, and a fresh Two Sum solve
> (2026-06-26) landed on the heatmap with today's goal ticking up. The 15-min
> cron keeps it current.
>
> Decisions locked: unique problems/day, `America/Chicago` timezone,
> validation-now-verify-later (no ownership proof yet).
>
> **Files added:** `convex/leetcodeSync.ts`, `convex/leetcodeSyncNode.ts`,
> `src/lib/today.ts`, `src/components/ConnectLeetcode.tsx`.
> **Modified:** `convex/schema.ts`, `convex/crons.ts`, `convex/leetcode.ts`,
> `src/hooks/useLeetcodeStats.ts`,
> `src/components/{DailyLeaderboard,GroupsManager,UserHeatmapCard}.tsx`,
> `src/app/upload/page.tsx`.
> **Removed:** `src/components/SubmissionGallery.tsx` — the "Your Recent
> Submissions" grid rendered one `<Image>` per submission (200+ after sync), a
> heavy load; deleted entirely. The home-page heatmaps (lightweight SVG) remain
> the canonical visualization of solves.
>
> **Known behavior / not-yet-done (see Phase 2 + edge cases below):**
> - New solves appear on the **next ≤15-min cron tick**, not instantly. Real-time
>   needs the Phase 2 browser extension.
> - **NeetCode editor solves are not captured** (no API; separate judge).
> - **No ownership verification yet** — anyone can claim a public username.
> - Public LeetCode profile required (private "recent submissions" → empty sync).
> - Manual screenshot upload retained as a fallback on `/upload`.



**Goal:** when a user solves a problem on leetcode.com (and, ideally, neetcode.io),
their heatmap + daily goal update automatically — no screenshot upload.

**Two hard constraints driving the design:**
1. Remove the manual screenshot friction.
2. Don't blow up the Convex plan (function calls, file storage, bandwidth).

---

## TL;DR — the recommendation

Poll **LeetCode's public GraphQL API** (`recentAcSubmissionList`) on a Convex
cron, per user, keyed off a **LeetCode username** we collect once. No auth
cookies, no screenshots, no file storage. This covers the large majority of real
usage (people who "study on NeetCode, submit on LeetCode" are caught too).

**NeetCode's own editor cannot be read via any API** — it runs its own judge
(Judge0 + Firebase), so a neetcode.io-only solve never touches LeetCode. The only
way to capture those is a **browser extension**. So:

- **Phase 1 (do this):** LeetCode username + cron polling. Zero install, kills the
  screenshot flow, near-zero Convex cost.
- **Phase 2 (optional, later):** a browser extension that intercepts the
  "Accepted" result on both leetcode.com and neetcode.io and pushes it to a Convex
  HTTP endpoint — real-time, covers NeetCode, and removes polling entirely.
- **Keep manual upload** as a fallback for private profiles / NeetCode-only users.

---

## Why screenshots are the wrong primitive

- **Storage + bandwidth.** Every solve writes an image to Convex file storage and
  re-downloads it on every heatmap render (`UserHeatmapCard` shows them in the
  day dialog). That's the line item that "eats the plan fast," not the row writes.
- **Friction.** Screenshot → crop → upload → fill a form, per problem. Nobody
  sustains that daily.
- **No verification anyway.** A screenshot proves nothing the API doesn't, and the
  API is structured data (title, slug, difficulty, timestamp) we can trust more.

The data we actually want is tiny: `(user, problem, difficulty, day)`. The
LeetCode API hands us exactly that.

---

## The options, compared

| Option | Covers | User effort | Realtime | Convex cost | Verdict |
|---|---|---|---|---|---|
| **A. LeetCode public GraphQL polling** | leetcode.com solves | enter username once | ~poll interval | very low | **Phase 1 — ship it** |
| B. Browser extension (intercept "Accepted") | leetcode.com **+ neetcode.io** | install extension | instant | ~zero (push) | **Phase 2 — best UX** |
| C. Authenticated `LEETCODE_SESSION` cookie | full private history | paste session cookie | poll | low | **Avoid** — takeover-grade credential, expires ~2wks |
| D. NeetCode API | neetcode.io | — | — | — | **Impossible** — no public API, separate judge |

### Key API facts (verified, 2026)

- **Endpoint:** `POST https://leetcode.com/graphql`, body `{"query","variables"}`.
- **Recent accepted solves** (public, no auth if the profile's recent submissions
  aren't hidden):
  ```graphql
  query recentAc($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id          # unique submission id — use as the dedupe key
      title
      titleSlug   # feeds the difficulty lookup
      timestamp   # Unix epoch SECONDS (string)
    }
  }
  ```
  Returns **only Accepted** submissions, **capped at ~15–20** most recent.
- **Difficulty** (public): `question(titleSlug:){ difficulty }` for one problem, or
  `problemsetQuestionList` once to bulk-build a slug→difficulty table.
- **Heatmap/streak shortcut** (public): `matchedUser.userCalendar(year).submissionCalendar`
  is a JSON string of `{ unixDayUTC: count }` — LeetCode's own heatmap data. Useful
  for a fast streak number, but it's per-*submission* per-day and has no problem
  detail, so it's a supplement, not a replacement for `recentAcSubmissionList`.
- **Headers matter server-side:** send a browser `User-Agent` and
  `Referer: https://leetcode.com`, or you're more likely to get blocked.
- **Rate limiting:** undocumented; returns HTTP 429 if hammered. Safe baseline
  ~2 req/sec. We poll slowly, so this is a non-issue.
- **Private profiles:** if a user hides "recent submissions" in LeetCode privacy
  settings, the list comes back empty — handle gracefully (prompt them, or fall
  back to `submissionCalendar` for counts).

### Why NeetCode can't be polled

NeetCode built its own LeetCode-style judge (Monaco editor + Judge0 execution +
Firebase). Solving in the neetcode.io editor **does not submit to leetcode.com**
and **does not appear** in `recentAcSubmissionList`. There is no public NeetCode
API for progress. Only a browser extension (Phase 2) can see those solves.

---

## Phase 1 — LeetCode polling (detailed)

### 1. Schema changes (`convex/schema.ts`)

```ts
users: defineTable({
  // ...existing...
  leetcodeUsername: v.optional(v.string()),
  leetcodeVerified: v.optional(v.boolean()),   // username resolves to a real profile
  lastLeetcodeSyncAt: v.optional(v.number()),  // unix ms, for backoff/telemetry
})
  .index("by_clerkId", ["clerkId"])
  .index("by_leetcodeUsername", ["leetcodeUsername"]),

leetcodeSubmissions: defineTable({
  userId: v.string(),
  problemTitle: v.string(),
  titleSlug: v.optional(v.string()),
  submissionDate: v.string(),                  // YYYY-MM-DD (canonical TZ, see §5)
  screenshotUrl: v.optional(v.string()),       // <-- now OPTIONAL
  difficulty: v.optional(v.string()),
  source: v.optional(v.string()),              // "leetcode" | "screenshot"
  externalId: v.optional(v.string()),          // LeetCode submission id (dedupe)
})
  .index("by_userId", ["userId"])
  .index("by_date", ["submissionDate"])
  .index("by_user_externalId", ["userId", "externalId"]),  // <-- dedupe lookups

// Optional: cache slug -> difficulty so we don't re-fetch per solve.
leetcodeProblems: defineTable({
  titleSlug: v.string(),
  title: v.string(),
  difficulty: v.string(),
}).index("by_slug", ["titleSlug"]),
```

> Making `screenshotUrl` optional is backward-compatible with existing rows.
> `UserHeatmapCard`'s day dialog should hide the `<Image>` when there's no URL.

### 2. Collect the username once (onboarding)

- Add a small field on the profile/upload page: "Your LeetCode username."
- On save, **validate** it by calling `matchedUser(username)` — reject if null.
- **Ownership verification — DECIDED: validate now, verify later.** Phase 1 ships
  with real-profile validation only (zero onboarding friction). A profile-token
  ownership check (user pastes a generated token into their LeetCode Name/Summary →
  we read it back via `matchedUser{profile{realName aboutMe}}` → set
  `leetcodeVerified = true` and show a "Verified ✓" badge) is a **fast-follow**, not
  a launch blocker. Until then, the impersonation hole (claiming a friend's public
  username) is accepted as low-risk for a tight, self-policing friend group.

### 3. The sync engine (`convex/leetcodeSync.ts`)

One **internal action** per cron tick that loops users sequentially (cheap on
Convex's function-call meter — one action invocation, not one per user) and
throttles requests:

```ts
const LC = "https://leetcode.com/graphql";
const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...",
  "Referer": "https://leetcode.com",
};

async function fetchRecentAc(username: string, limit = 15) {
  const body = {
    query: `query($u:String!,$n:Int!){recentAcSubmissionList(username:$u,limit:$n){id title titleSlug timestamp}}`,
    variables: { u: username, n: limit },
  };
  const res = await fetch(LC, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
  if (res.status === 429) throw new Error("rate-limited");
  const json = await res.json();
  return (json.data?.recentAcSubmissionList ?? []) as
    { id: string; title: string; titleSlug: string; timestamp: string }[];
}

export const syncAllUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.leetcodeSync.usersToSync); // username set + verified
    for (const u of users) {
      try {
        const subs = await fetchRecentAc(u.leetcodeUsername!, 15);
        await ctx.runMutation(internal.leetcodeSync.ingest, { userId: u.clerkId, subs });
      } catch (_) { /* log + continue; on repeated 429 widen the interval */ }
      await new Promise((r) => setTimeout(r, 250)); // ~4 req/s ceiling
    }
  },
});
```

The **ingest mutation** dedupes by `externalId`, resolves difficulty from the
cache, inserts only new rows, and bumps `dailyCompletions` — reusing the exact
logic already in `addSubmission`:

```ts
export const ingest = internalMutation({
  args: { userId: v.string(), subs: v.array(v.object({
    id: v.string(), title: v.string(), titleSlug: v.string(), timestamp: v.string(),
  })) },
  handler: async (ctx, { userId, subs }) => {
    for (const s of subs) {
      const existing = await ctx.db
        .query("leetcodeSubmissions")
        .withIndex("by_user_externalId", q => q.eq("userId", userId).eq("externalId", s.id))
        .unique();
      if (existing) continue;                          // already have it -> no write

      const date = unixToDateString(Number(s.timestamp)); // §5
      const difficulty = await lookupDifficulty(ctx, s.titleSlug); // cache or null

      await ctx.db.insert("leetcodeSubmissions", {
        userId, problemTitle: s.title, titleSlug: s.titleSlug,
        submissionDate: date, difficulty, source: "leetcode", externalId: s.id,
      });
      await bumpDailyCompletion(ctx, userId, date);     // same as addSubmission
    }
  },
});
```

### 4. The cron (`convex/crons.ts`)

```ts
crons.interval("leetcode-sync", { minutes: 15 }, internal.leetcodeSync.syncAllUsers);
```

### 5. Timezone (matters for streaks!) — DECIDED: `America/Chicago`

`timestamp` is UTC seconds. "Did you grind *today*" depends on a chosen day
boundary. **Canonical timezone = `America/Chicago` (US Central)** — matches the
Omaha/Central hints in the codebase and the crew's locale, so "today" lines up
with the boys' actual wall-clock day. Convert consistently: `unixToDateString(ts)`
→ `YYYY-MM-DD` in Central. **The client must match:** update `DailyLeaderboard`
and `StreakHero`, which currently call `format(new Date(), "yyyy-MM-dd")` (browser-
local), to format in `America/Chicago` too — otherwise a user in another timezone
sees a different "today" than the sync recorded.

> If the group ever spans timezones and that feels wrong, the alternative is a
> per-user timezone — but for one friend group, a fixed zone is simpler and fine.

### 6. Daily-count semantics — DECIDED: unique problems per day

`dailyCompletions.count` = number of **distinct problems** solved that day
(dedupe by `titleSlug` within the day). Re-solving the same problem, or LeetCode
returning multiple accepted submissions for one problem, counts once. This keeps
the daily goal from being gamed by resubmitting a single problem.

Implementation note: since count is now "distinct problems," don't blindly `+1`
on every insert. On a new submission, only bump `dailyCompletions` if no existing
`leetcodeSubmissions` row for that `(userId, titleSlug, submissionDate)` already
exists. (Add a `by_user_slug_date` index, or check in the `ingest` mutation.)

---

## Convex cost analysis

The expensive thing today (image storage/bandwidth) **goes away**. What's left is
cheap and predictable:

- **Function calls:** 1 action per tick + 1 query + writes **only when there's
  something new**. At a 15-min interval that's **96 action runs/day (~2,880/month)**
  regardless of user count, because one action loops all users internally. Inserts
  happen only on genuinely new solves.
- **External fetches** (to LeetCode) are **not** Convex function calls — they're
  action compute time. ~250 ms/user → 40 users ≈ 10 s per tick; 96 ticks/day ≈
  ~16 min compute/day. Comfortable.
- **No file storage, no image bandwidth.**

**Knobs if you ever need to shrink it further:**
1. **Interval** — 15 min is plenty; overnight you could drop to hourly.
2. **Only poll "active" users** — those with a verified username seen in the last
   N days. Skip dormant accounts.
3. **Back off the satisfied** — once a user hits the daily goal, stop polling them
   until tomorrow.
4. **Paginate across ticks** if you ever have hundreds of users (sync 50/tick,
   round-robin) so no single action runs long or trips rate limits.

Net: this is *cheaper* than the screenshot system on every axis.

---

## Phase 2 — browser extension (covers NeetCode + real-time)

Only needed to capture neetcode.io solves and/or to go instant + zero-poll.

**How it detects a solve:**
- **leetcode.com:** the SPA submits, then polls
  `https://leetcode.com/submissions/detail/{id}/check/` until the JSON has
  `state:"SUCCESS"`; `status_msg:"Accepted"` means a pass. An MV3 extension injects
  a page-context script that monkey-patches `fetch`/`XMLHttpRequest` to read that
  response (MV3 `webRequest` can't read bodies), then posts the result out.
- **neetcode.io:** same monkey-patch technique, watching its **Judge0** result
  (`status.id === 3` / `"Accepted"`). Exact request must be confirmed from the
  network tab.

**Push to Convex** via an `httpAction` endpoint (`convex/http.ts`) authenticated
with the signed-in user, calling the same `ingest` mutation:

```ts
http.route({ path: "/ingestSolve", method: "POST", handler: httpAction(async (ctx, req) => {
  // verify Clerk token from header, parse { titleSlug, title, source, solvedAt }
  await ctx.runMutation(internal.leetcodeSync.ingestOne, { userId, ... });
  return new Response("ok");
}) });
```

This makes solves instant and removes polling entirely — but costs you an
extension to build, publish, and get users to install. Hence: Phase 2.

---

## Edge cases & decisions to lock down

- **Private LeetCode profile** → empty list. Detect, and prompt the user to make
  recent submissions public, or fall back to `submissionCalendar` (counts only).
- **>15 solves between polls** → you'd miss the overflow (list caps ~15/20).
  Irrelevant at a 15-min interval for a human; relevant only if you poll rarely.
- **Username changes / typos** → re-validate on save; store `leetcodeVerified`.
- **Ownership/anti-cheat** → optional profile-code verification (above).
- **Backfill** → on first link, do one larger pull to seed recent history (still
  capped ~20 by the public API; full history needs the session cookie you're
  avoiding — probably fine to start "from now").
- **Migration** → `screenshotUrl` optional is non-breaking; update
  `UserHeatmapCard` to render without an image; keep the upload form as fallback.

---

## Rollout order — Phase 1 status

1. ✅ Schema: username fields, `screenshotUrl` optional, dedupe + slug/date indexes,
   `leetcodeProblems` cache.
2. ✅ Username capture + `matchedUser` validation (`ConnectLeetcode` on `/upload`).
3. ✅ `leetcodeSync.ts` + `leetcodeSyncNode.ts` (action + `usersToSync` + `ingest` +
   difficulty cache) + 15-min cron. Validated end-to-end.
4. ✅ `UserHeatmapCard` day dialog handles screenshot-less rows ("Synced from
   LeetCode"). `SubmissionGallery` removed entirely (compute).
5. ✅ Canonical timezone (`America/Chicago`) wired across server sync (`unixToDate`)
   and client "today" (`src/lib/today.ts`, used by hook + leaderboard + groups).
6. ⬜ **Phase 2 (later):** browser extension + `httpAction` ingest endpoint for
   NeetCode coverage + real-time. Plus the fast-follow "Verified ✓" ownership check.

---

## Sources
- `recentAcSubmissionList` query: github.com/yerass11/Leetcode-Stats-API, pastecode.io/s/7uiqkb46
- profile / `submissionCalendar` / `submitStats` + required headers: github.com/faisal-shohag/leetcode_api
- difficulty / `problemsetQuestionList`: github.com/akarsh1995/leetcode-graphql-queries
- ready-made wrapper (`leetcode-query`, rate limiter, `Credential`): github.com/JacobLinCool/LeetCode-Query
- REST wrapper (`alfa-leetcode-api`): github.com/alfaarghya/alfa-leetcode-api
- leetcode.com submit→check polling pattern: github.com/emacsmirror/leetcode (`leetcode.el`)
- extension XHR/fetch interception: github.com/LeetSync/LeetSync
- 429 behavior: leetcode.com/discuss/feedback/2007396
- NeetCode uses its own Judge0 backend: github.com/neetcode-gh
