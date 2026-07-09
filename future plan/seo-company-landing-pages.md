# Per-Company SEO Landing Pages

**Status:** idea, not started
**Origin:** SEO work on 2026-07-08 — flagged as the highest-leverage next SEO play.

## The idea

Public, per-company landing pages at `/jobs/<company>` (e.g. `/jobs/uber`, `/jobs/adobe`,
`/jobs/microsoft`) that can rank for long-tail searches like:

- "uber new grad software engineer jobs"
- "adobe entry level swe openings"
- "microsoft software engineer jobs board"

Right now all job data lives behind one signed-in `/jobs` page, so Google has a single
generic page to rank. Per-company pages give every tracked company (20 public and
growing) its own indexable URL, title, and description — 20+ shots at ranking instead
of one.

## Why it should work

- Long-tail "<company> new grad swe jobs" queries have real volume from exactly the
  r/csMajors audience the site targets, and weak competition (mostly stale aggregator
  spam).
- The data already exists and refreshes hourly via Convex crons — no new fetching work.
- Fresh, frequently-updated pages with real listings are exactly what Google rewards.

## Implementation sketch

1. **Route:** `src/app/jobs/[company]/page.tsx`, statically generated from
   `TRACKED_COMPANIES` (public companies only — respect `PRIVATE_COMPANY_NAMES`).
   `generateStaticParams` + `generateMetadata` for per-company title/description/canonical.
2. **Show some listings publicly.** For SEO the page must contain real content, not a
   sign-in wall. Options:
   - show the N most recent postings publicly, full board when signed in, or
   - show titles + locations publicly but gate the apply links.
   Needs a public (unauthenticated) Convex query per company — decide how much to expose.
3. **Structured data:** consider `JobPosting` JSON-LD per listing (Google Jobs rich
   results). Note Google requires the posting content to be on the page and kept
   current — the hourly crons make "current" easy; the dealbreaker check is whether
   linking out to the company's apply page (rather than hosting the description) is
   compliant enough. Investigate before promising rich results.
4. **Internal links:** landing-page logo wall tiles → `/jobs/<company>`; each company
   page cross-links the others ("also tracking …"). Add all pages to `sitemap.ts`.
5. **Copy:** a short unique intro paragraph per company page (what the company is, what
   roles it typically posts, refresh cadence) so pages aren't thin/duplicate content.

## Open questions

- How many listings to show signed-out (all? newest 10?) — trade SEO content vs.
  sign-up incentive.
- Slug scheme for multi-word names ("H&R Block" is private anyway, but "T-Mobile" →
  `t-mobile`).
- Whether `/jobs` should become a public index page linking to all company pages.
