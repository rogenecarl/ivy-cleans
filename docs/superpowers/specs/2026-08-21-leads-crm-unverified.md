# Leads and CRM: what has never been verified against a real database

**Date:** 2026-08-21
**Branch:** `feat/leads-crm`
**Companion to:** `2026-08-21-leads-crm-design.md`

Read this before trusting the leads feature in production.

The whole branch was built and reviewed without a database: the Neon credential
was mid-rotation and never available in the worktree. Every gate that could run,
ran and passed — 330 tests, typecheck, lint, build, and 34/34 end-to-end admin
checks. But the eight database-backed tests skipped throughout, and the one
end-to-end case that exercises the actual lead-capture chain has only ever run
its skip path.

The whole-branch review's merge recommendation was therefore:

> **Run `node scripts/admin-e2e.mjs` once with a real `DATABASE_URL` before
> trusting this.** That single run exercises the chain nothing else does:
> submit a real form, get a real row, see it in the dashboard, move its status,
> save a note, clean up.

Everything else on the branch was judged merge-ready as-is.

## Why this file exists

Two release-blocking bugs were found by the whole-branch review, after all
thirteen tasks had passed their own reviews. Both were seams between
individually-correct pieces, and both are the kind this environment could not
catch:

- **Every lead from any city except the default was filed as test data** —
  never emailed, filtered out of all three screens, excluded from the counts,
  with no control anywhere to see them. The Sites row would have read `0 / 0`
  while real customers accumulated in Postgres unanswered.
- **A blank `IP_HASH_SALT` line — exactly what the env template ships — made
  every submission fail.** Undetectable on a developer machine, because
  `next dev` sets no IP headers so the salt is never reached.

Both are fixed on this branch. They are recorded here because they show that
passing gates in a database-less environment proved less than it appeared to.

## Setup checklist before the first real run

1. Put the rotated Neon credentials in **`.env`**, not `.env.local` — Prisma's
   CLI auto-loads only a file named `.env`. Both `DATABASE_URL` (pooled) and
   `DIRECT_DATABASE_URL` (non-pooler, required by Prisma Migrate).
2. Set `IP_HASH_SALT`, `LEADS_FROM_EMAIL` and `LEADS_DASHBOARD_ORIGIN` in
   `.env.local`. A missing salt now degrades the rate limit rather than
   refusing customers, and a missing dashboard origin omits the email's link
   rather than guessing one — but all three log a warning on first use.
3. `pnpm prisma db push` — this has never been run anywhere.
4. `pnpm test` — the eight skipped store tests should now execute.
5. `node scripts/admin-e2e.mjs` against a dev server — the leads case should
   now run instead of skipping.

---

The list below is the implementer's own account, preserved verbatim from the
Task 13 report.

---

## What remains unverified against a real database

This entire plan (Tasks 1–13) was never executed against a live Neon database
in any environment available during the build. `DATABASE_URL` and
`DIRECT_DATABASE_URL` were absent from `.env`, `.env.local` and the ambient
shell throughout. Concretely, nobody — no task in this plan — ever saw the
following actually happen:

1. **`prisma db push` running at all.** The `Lead` and `SiteSettings` tables
   have never been created anywhere. `prisma/schema.prisma` has only ever been
   validated by `prisma generate`, which needs no connection, never applied.

2. **Any row ever being written to a `Lead` or `SiteSettings` table.**
   `tests/leads-store.test.ts`'s 8 tests — `createLead`, `markLeadEmail`,
   `listLeads` filtering by city/status/form/test-visibility, `setLeadStatus`,
   `setLeadNotes`, `countRecentByIpHash`, `leadCountsByCity`,
   `upsertSiteSettings`/`getSiteSettings` — have skipped since Task 1 and skip
   still.

3. **A real form submission reaching the database through the real HTTP path.**
   `submitLeadAction` → `submitLead` → `createLead` has only ever been
   exercised through `SubmitPorts` mocks, never with a real Prisma client
   behind it.

4. **Any of the four admin screens rendering its SUCCESS path.** All four now
   render something legible with no database, and that part is curl-verified —
   but none has ever been seen rendering real rows, real counts, or a real
   readiness chip.

5. **The Task 13 leads-capture E2E case** (`scripts/admin-e2e.mjs`, section 8).
   Written, syntax-checked, and its skip path exercised on every gate run — but
   the submit → row → dashboard → status → notes → cleanup chain it describes
   has never executed successfully end to end. Note that its city-pill
   assertion was found to be wrong by the whole-branch review and corrected by
   reading, not by running.

6. **Email delivery through the real Resend adapter.** `STUB_EMAIL=1` is forced
   suite-wide on purpose, so no test or script run under this configuration
   will ever exercise `src/leads/mailer.ts`'s non-stub path.

7. **`markLeadEmail`'s status transitions under real I/O** — a real Resend
   failure (bad API key, unverified domain, rate limit) recorded as
   `emailStatus: 'failed'` with a real error string on a real row.

8. **`countRecentByIpHash`'s rate limiting under concurrent real traffic** —
   only ever exercised against fabricated hashes in the skipped unit tests.

9. **`leadCountsByCity`'s aggregate correctness at any real scale.** The
   indexes have never been created, let alone exercised by a query plan.

10. **Any interaction between two real processes writing concurrently.**

11. **The test-row toggle's rendered output**, added in the final fix wave.
    Its logic is unit-tested; its appearance with real hidden rows is not.

## Known limitations, deliberately not fixed

- **No pagination.** `listLeads` caps at 200 rows and nothing says so in the
  UI, so past 200 leads the operator silently sees only the newest. The hidden
  test-row count is uncapped, so the two numbers are on different scales.
- **A failed notification marks a city permanently.** No retry mechanism exists
  to clear it, so a single old failure leaves a red chip forever.
- **Honeypot rejections are invisible.** A false positive silently discards a
  real customer with no record anywhere; they believe they submitted.
- **`renderedCityKey` is unvalidated on the capture path.** A hostile POST with
  a junk key creates a visible row that cannot be emailed. List pollution, not
  a breach.
- **Payload field values have no length cap** (pre-existing).
- **No authentication anywhere in the admin**, by explicit decision. The
  unguessable path is the only access control, and the screens display customer
  names, phone numbers, email addresses and home addresses.
