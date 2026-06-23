# Implementation Plan: Friend Groups + Premium ($4.99) + Email Alerts

> Status: **planning** — nothing in this document is implemented yet.
> Auth: Clerk. Backend: Convex. Payments: Stripe. Email: Resend.

---

## 1. Product rules

| Capability | Free (Basic) | Premium ($4.99/mo) |
|---|---|---|
| Create groups | ✅ | ✅ |
| Max members per group | **3** | **15** |
| Job board (view) | ✅ | ✅ |
| Email alerts on new postings | ❌ (upsell) | ✅ |

**Premium signal:** `users.stripeSubscriptionStatus === "active"` (already maintained by the Stripe webhook). A single subscription unlocks both the 15-member cap and email alerts.

---

## 2. What already exists (grounding)

Billing is roughly 70% wired already:

- Clerk auth via `clerkMiddleware`; in Convex, `identity.subject` = `clerkId` (same string used as `userId` on submissions). — `src/middleware.ts`
- On Clerk `user.created`, a **Stripe customer is auto-created** and `stripeCustomerID` stored. — `convex/http.ts` (`clerkWebhook`)
- `createSubcriptionCheckoutSession(priceId)` action **already exists** but is **wired to nothing** in the UI. — `convex/stripe.ts:51`
- The Stripe webhook **already flips** `stripeSubscriptionStatus` → `"active"` on `customer.subscription.created` and `"inactive"` on `.deleted`. — `convex/http.ts` (`stripeWebhook`)
- `getUserInfo` already returns `{ credit, stripeSubscriptionStatus }` for premium checks. — `convex/user.ts:146`
- `PricingCard` component exists but is **rendered nowhere**. — `src/components/PricingCard.tsx`
- `UserInfoCard` shows a billing-portal button for subscribers. — `src/components/UserInfoCard.tsx`

**Missing:** the `$4.99` Price + a checkout/pricing page that calls the existing action; the groups data model & backend; the email-alert backend & UI; and premium gating on group size + alerts.

---

## 3. Decisions / assumptions

Flag if any are wrong before building:

1. **Group cap is gated by the _owner's_ premium status** — the owner "hosts" the bigger group. Checked at join time. (Alternative: any member grants the cap. Owner-pays is cleaner for monetization.)
2. **"Max 3"** = 3 members **total**, including the owner. (If you mean owner + 3 invitees = 4, it's a one-constant change.)
3. **Owner leaving disbands the group** (no ownership transfer in v1).
4. Single premium tier; no proration logic beyond what Stripe handles.

---

## 4. Stripe / billing setup (mostly config, minimal code)

**Dashboard (manual):**
- Create a **recurring Product/Price**: $4.99 / month. Copy the `price_…` id.
- Ensure the Stripe webhook endpoint (`/stripe`) is subscribed to `customer.subscription.created`, `.deleted`, and ideally `.updated`.

**Env vars:**
- `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_…` (client needs it to start checkout).
- `NEXT_PUBLIC_APP_URL=https://…` (for success/cancel redirect URLs).
- (Already needed: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.)

**Code change — `convex/stripe.ts:77`:** the `success_url` / `cancel_url` are hardcoded to `http://localhost:3000`. Change to redirect to a real page and accept an origin:
- Read origin from `NEXT_PUBLIC_APP_URL` (or pass as an arg), set
  `success_url = ${origin}/upgrade?success=1`, `cancel_url = ${origin}/upgrade?canceled=1`.

**Optional hardening — `convex/http.ts`:** add a `customer.subscription.updated` case that sets status from `event.data.object.status` (catches `past_due`/`canceled`). Not required for v1.

> ⚠️ **No new billing backend needed beyond the URL fix** — the subscription → active flow already works via the webhook.

---

## 5. Data model (additions to `convex/schema.ts`)

```
groups:        { name, ownerId(clerkId), inviteCode, createdAt }
               indexes: by_ownerId, by_inviteCode

groupMembers:  { groupId: id("groups"), userId(clerkId), joinedAt }
               indexes: by_group, by_user, by_group_user

jobAlerts:     { userId(clerkId), company, email }
               indexes: by_user, by_company, by_user_company
```

`company` stores the display name (e.g. `"Apple"`), which already matches both the fetcher's `company:` arg and `JobBoard`'s `companyName` — verified aligned across all 14 trackers.

---

## 6. Backend — Convex functions

### `convex/groups.ts` (new)

Shared helpers: `requireClerkId(ctx)` (throws if no `identity`), `isPremium(ctx, clerkId)`, `capForOwner(ctx, ownerId)` → `3 | 15`. Constants `FREE_CAP=3`, `PREMIUM_CAP=15`.

| Function | Type | Behavior |
|---|---|---|
| `createGroup({name})` | mutation | Auth required; generate unique 6-char invite code (collision-retry, ambiguous chars removed); insert group + owner membership. Returns `{groupId, inviteCode}`. |
| `joinByCode({inviteCode})` | mutation | Find group by code; no-op if already a member; **enforce `members.length < capForOwner`** else throw a clear "group full / owner can upgrade" error; insert membership. |
| `leaveGroup({groupId})` | mutation | Owner → disband (delete group + all memberships); member → delete own membership. |
| `deleteGroup({groupId})` | mutation | Owner-only; cascade delete memberships. |
| `kickMember({groupId,userId})` | mutation | Owner-only; can't kick self. |
| `getMyGroups()` | query | Groups I belong to with `{memberCount, cap, isOwner, inviteCode}`. |
| `getGroupDetail({groupId, date})` | query | **Membership-guarded** (returns `null` if not a member). Returns members sorted by today's count, each `{name, imageUrl, isOwner, todayCount, totalSolved}` — joins `users`, `dailyCompletions` (by_user_date), `leetcodeSubmissions`. |

### `convex/jobAlerts.ts` (new)

| Function | Type | Behavior |
|---|---|---|
| `toggleAlert({company})` | mutation | Auth + **premium required** (throws `ConvexError` for non-premium → UI shows upsell); toggles a `jobAlerts` row; stores user's email. |
| `getMyAlerts()` | query | List of company names I'm subscribed to (for bell state). |
| `getSubscribersForCompany({company})` | internalQuery | Emails of subscribers **re-checked for active premium** (lapsed users silently stop receiving). |

### `convex/email.ts` (edit)

- Rename `_ctx` → `ctx`, extract a small `postEmail(apiKey, to, subject, html)` helper.
- Keep the existing owner email (`NOTIFICATION_EMAIL`).
- **Add fan-out:** `const subs = await ctx.runQuery(internal.jobAlerts.getSubscribersForCompany, {company})` → send the same HTML to each. One edit here covers all 14 trackers (they all call `sendNewJobsEmail`).

> ⚠️ **Resend gotcha:** the current `from: onboarding@resend.dev` is Resend's sandbox sender and can only deliver to **your own** account email. To email real premium users you must **verify a sending domain in Resend** and change the `from`. This is a prerequisite for alerts to actually work in production.

---

## 7. Frontend

### A. Checkout / pricing page — `src/app/upgrade/page.tsx` (new)
- Client page using the existing `PricingCard` (render Free + Premium $4.99/mo).
- Premium button → `useAction(api.stripe.createSubcriptionCheckoutSession)({ priceId: NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID })` → `window.location.href = url`.
- Read `?success` / `?canceled` query params to show a confirmation/cancel toast.
- If already premium (`getUserInfo`), show "You're Premium ✓" + billing-portal link (reuse `UserInfoCard` pattern).
- Gate behind sign-in: signed-out → Clerk `SignInButton`.

### B. Groups page — `src/app/groups/page.tsx` + `src/components/GroupsManager.tsx` (new)
- **Auth gate:** signed-out → prompt sign in.
- **Create group** dialog (`ui/dialog`): name input → `createGroup` → show invite code with copy button.
- **Join group** dialog: invite-code input → `joinByCode` → handle "full" error with an "Upgrade" link to `/upgrade`.
- **My groups list** (`getMyGroups`): cards showing `name`, `memberCount / cap`, owner badge, invite code (copyable). If owner is free and group is at 3, show a subtle "Upgrade to invite up to 15" nudge → `/upgrade`.
- **Group detail / leaderboard** (`getGroupDetail` with `date = format(new Date(),"yyyy-MM-dd")` via `date-fns`, matching `DailyLeaderboard.tsx:14`): ranked member list with avatar, today's count, total solved; owner gets kick/delete controls; everyone gets leave.

### C. Job-alert bell — `src/components/JobAlertBell.tsx` (new), used inside `JobBoard.tsx` header
- Props: `company`. Uses `useUser`, `getUserInfo` (premium?), `getMyAlerts`, `useMutation(toggleAlert)`.
- Signed-out → hidden. Premium → bell toggles subscribe/unsubscribe (filled when on). Non-premium → bell with a small "Premium" lock; click routes to `/upgrade` (or shows upsell popover) rather than erroring.
- Rendered next to the job-count badge in the `JobBoard` header.

### D. Nav — `src/components/Header.tsx` (edit)
- Add signed-in links: **Groups** (`/groups`) and **Upgrade**/**Premium** (`/upgrade`).

### E. Premium hook (small DRY helper)
- `src/hooks/usePremium.ts`: wraps `getUserInfo` → `{ isPremium, isLoading }`, reused by the bell, groups page, and upgrade page.

---

## 8. Security / enforcement (server-side, never trust client)

- Group cap enforced in `joinByCode` (not UI).
- `toggleAlert` re-checks premium; `getSubscribersForCompany` re-checks premium at send time.
- `getGroupDetail` returns `null` for non-members (no leaderboard leakage).
- Owner-only ops (`deleteGroup`, `kickMember`) verified against `group.ownerId`.

---

## 9. End-to-end notification flow

Cron fires hourly → fetcher finds new jobs → `saveXJobs` returns new ones → `sendNewJobsEmail(company, jobs)` → owner email **+** `getSubscribersForCompany` fan-out → premium subscribers get the email.

---

## 10. Edge cases

- Free owner downgrades while group has 4–15 members: existing members **stay**, but no new joins until back under 3 (don't auto-kick).
- Duplicate join / self-join: idempotent.
- Invite-code collisions: retry loop.
- User deletes Clerk account: leftover memberships/alerts are harmless (queries null-guard on `users`).
- Premium lapses: alerts auto-stop via the send-time recheck.

---

## 11. Suggested build order (phased, each independently testable)

1. **Billing** — create Stripe Price, add env, fix `success_url`/`cancel_url`, build `/upgrade` page. → verify a test-mode subscription flips `stripeSubscriptionStatus` to `active`.
2. **Groups backend** (`schema` + `groups.ts`). → test via `npx convex run`.
3. **Groups UI** (`/groups`, `GroupsManager`, detail leaderboard) + Header link.
4. **Alerts backend** (`jobAlerts.ts` + `email.ts` fan-out) + verify Resend domain.
5. **Alerts UI** (`JobAlertBell` in `JobBoard`).
6. **Polish** — upsell nudges, copy-invite, toasts.

---

## 12. Verification

- Convex: `npx tsc --noEmit` + `npx convex dev` (regenerates types, creates tables/crons).
- Stripe test card `4242 4242 4242 4242`; confirm webhook → `active`.
- Cap test: free owner blocks the 4th join; premium owner allows up to 15.
- Alert test: subscribe as premium, run a fetcher manually (`npx convex run apple:fetchAppleJobsAction`) and confirm email.

---

## 13. Out of scope (v1)

Ownership transfer, group chat/activity feed, per-company alert preferences beyond on/off, SMS/push, annual plan, multiple group tiers.

---

## 14. File-change summary

**New (Convex):** `convex/groups.ts`, `convex/jobAlerts.ts`
**Edit (Convex):** `convex/schema.ts`, `convex/email.ts`, `convex/stripe.ts`, (optional) `convex/http.ts`
**New (frontend):** `src/app/upgrade/page.tsx`, `src/app/groups/page.tsx`, `src/components/GroupsManager.tsx`, `src/components/JobAlertBell.tsx`, `src/hooks/usePremium.ts`
**Edit (frontend):** `src/components/Header.tsx`, `src/components/JobBoard.tsx`

~10 files total (3 new Convex + edits; ~5 new frontend + 2 edits).
