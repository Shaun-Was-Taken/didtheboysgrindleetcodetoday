# Clerk Production Migration

> Status: **planned** — the last piece of dev infrastructure in the serving path.
> Everything else (Convex prod `bright-shrimp-175`, live Stripe, Resend, domain/SSL) is already on production footing.

## Why

The live site authenticates against Clerk's **development instance** (`pk_test_…`). Dev instances have user caps and shared OAuth credentials — they will bite if a launch post works. This migration creates a Clerk **production instance** on `didtheboysgrindleetcodetoday.com` and relinks existing users' data.

**Cost: $0.** Clerk's free tier includes production instances (free up to 50k retained users as of Feb 2026).

## Current state (grounding)

- Auth: Clerk dev instance; Google OAuth via Clerk's shared dev credentials.
- Backend: Convex prod `bright-shrimp-175`; `CLERK_ISSUER`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` on prod env point at the **dev** instance.
- Clerk webhook endpoint (dev instance) → `https://bright-shrimp-175.convex.site/clerk-webhook`.
- 13 existing users, keyed everywhere by their **dev-instance clerkId** (`users.clerkId`, and `userId` fields in `leetcodeSubmissions`, `dailyCompletions`, `groupMembers`, `jobAlerts`, plus `groups.ownerId`).

## The gotcha to understand before starting

Users do NOT transfer between Clerk instances. Everyone signs in again on the prod instance (same Google account — painless), but Clerk assigns **new user IDs**. Without a remap, all history appears lost because Convex data still references old IDs. Step 7 fixes this by matching old→new **by email** and patching every table.

---

## Steps

### 1. Create the production instance (Shaun, ~2 min)
Clerk dashboard → instance dropdown (top bar) → **Create production instance** → "Clone development settings" → domain: `didtheboysgrindleetcodetoday.com`.

### 2. DNS records (Shaun, ~10 min + propagation)
Clerk shows a set of records (roughly: `clerk.` CNAME, `accounts.` CNAME, 2–3 email/DKIM CNAMEs). Add them in **Vercel DNS** (it holds the domain's nameservers). Wait for Clerk's dashboard to show all records verified.

### 3. Google OAuth credentials (Shaun, ~15–30 min — the annoying one)
Production instances can't use Clerk's shared dev OAuth.
1. [Google Cloud Console](https://console.cloud.google.com) → create/select a project.
2. **APIs & Services → OAuth consent screen**: External, app name, support email; publish the app.
3. **Credentials → Create credentials → OAuth client ID** → Web application.
4. Clerk dashboard (prod instance) → SSO connections → Google → "Use custom credentials" — it shows the exact **redirect URI** to paste into the Google client.
5. Paste Google's client ID + secret into Clerk.

### 4. New keys everywhere (Shaun runs; values from the PROD Clerk instance's API Keys page)
**Vercel** (Production env, then redeploy — but hold the redeploy until step 6 is done):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_live_…`
- `CLERK_SECRET_KEY` = `sk_live_…`

**Prod Convex** (terminal):
```bash
npx convex env set --prod CLERK_SECRET_KEY sk_live_…
npx convex env set --prod CLERK_ISSUER https://clerk.didtheboysgrindleetcodetoday.com
```
(The prod issuer is shown on the prod instance's API keys page — verify it matches before setting.)

> Local dev keeps the dev-instance keys in `.env.local` and the dev Convex deployment — do not change those. Dev stays a safe sandbox.

### 5. Clerk webhook for the prod instance (Shaun, ~3 min)
Prod instance → Webhooks → Add endpoint:
- URL: `https://bright-shrimp-175.convex.site/clerk-webhook`
- Events: `user.created`, `user.updated` (match whatever the dev endpoint subscribes to)
- Copy the new signing secret:
```bash
npx convex env set --prod CLERK_WEBHOOK_SECRET whsec_…
```

### 6. Convex auth config check (Claude)
`convex/auth.config.ts` reads `CLERK_ISSUER` from env — confirm no hardcoded dev issuer anywhere, then `npx convex deploy` if anything changed.

### 7. Cutover + user remap (together, ~30 min window)
1. Heads-up in the group chat: "you'll get signed out once, just sign back in."
2. Vercel redeploy (bakes the new publishable key). Everyone is signed out.
3. Each user signs in with Google again → Clerk webhook creates a NEW user row (new clerkId, same email) and a fresh Stripe customer.
4. **Remap script (Claude writes/runs):** internal mutation that, for each *new* user row, finds the *old* row with the same email and:
   - copies `stripeCustomerID`, `stripeSubscriptionID`, `stripeSubscriptionStatus`, `leetcodeUsername`, `leetcodeVerified` from old → new (keeps paid premium!),
   - rewrites `userId` on `leetcodeSubmissions`, `dailyCompletions`, `groupMembers`, `jobAlerts` and `ownerId` on `groups` from old clerkId → new clerkId,
   - deletes the old user row.
   Run per-user or in one pass after the boys have re-signed-in; idempotent so it can run repeatedly as stragglers log in.

### 8. Verification
- New signup (fresh account) → Clerk webhook delivery shows 200; user row + Stripe customer created.
- Existing user (Shaun): sign in → run remap → heatmap, group membership, and **premium status** all intact.
- `npx convex data users --prod` → no duplicate emails left once everyone has migrated.
- Stripe billing portal still opens (customer ID survived the remap).

## Rollback
Nothing is deleted until the remap runs per-user, and the dev Clerk instance keeps working throughout. If something breaks mid-cutover: revert the two Vercel vars + redeploy, revert the three prod Convex env vars — the site is back on dev Clerk exactly as before.

## Out of scope
Migrating users who never sign in again (their old rows just sit there harmlessly); SMS/passwords (Google OAuth only today); custom email templates.
