# Leads capture and centralized CRM dashboard

**Date:** 2026-08-21
**Status:** Design, awaiting review
**Supersedes:** nothing. Extends `2026-08-08-multi-tenant-dynamic-site-design.md`.

## 1. Problem

Every city site renders a Book Now form (10 fields) and a Contact form (5 fields).
Neither does anything. `BookingForm.tsx` intercepts submit and swaps in
`ComingSoonPanel`; `ContactFormDisplay.tsx` has no handler at all. A customer who
fills either one is silently discarded.

Abdi wants submissions to reach one dashboard covering every site, with the
originating city visible on each row, plus an email when one arrives.

From the 2026-08-19 meeting transcript, verbatim:

> "it should go to a dashboard where we can see everybody's filled out
> responses. So I think all the websites can go to that dashboard and it can
> say, you know, this is coming from the Miami website, so we know, you know,
> name. It's kind of like a CRM"

Three requirements fall out of that: one dashboard for all sites, city
attribution visible per row, and CRM behaviour rather than a plain inbox.

## 2. Decisions

Every decision below was made by the user in the 2026-08-21 brainstorming
session. Where a decision contradicts an earlier meeting note, that is called
out so the contradiction is not silently lost.

| # | Decision | Note |
|---|----------|------|
| D1 | Leads stored in a database **and** emailed | Not email-only |
| D2 | Neon Postgres | Already provisioned by the user |
| D3 | Prisma as the DB layer | Reversed from an initial Drizzle recommendation because the user does not know Drizzle and maintains this repo alone. Familiarity outweighs bundle size at this traffic level. |
| D4 | Dashboard = Sites overview + Leads inbox ("layout B") | A per-city-only view was rejected by Abdi's "all the websites can go to that dashboard" |
| D5 | Light CRM: 5-state pipeline + notes | Not a plain handled/unhandled toggle, not a full contact-record CRM |
| D6 | **No authentication.** The secret admin path is the only access control | User decision, made with the PII risk stated explicitly. See §10. |
| D7 | One verified sending domain, per-city recipient inboxes | Revises the user's earlier "per-city sending domain" pick. Neither transcript has Abdi asking for per-city sending domains; the 2026-08-08 note has him asking for a single shared inbox. |
| D8 | Host-to-city map moves into Postgres | So publishing a city stops requiring a commit and redeploy |
| D9 | No TanStack Query, no Zustand | Server Components for reads, Server Actions for writes, URL search params for filter state |

### Non-goals

- Authentication (D6).
- Full CRM: deduplicated contact records, cross-submission history, assigning
  leads to staff members.
- Any email to the customer. Nothing is sent to the person who filled the form.
- Per-site traffic or conversion analytics.
- Anything already parked: the 3-step booking wizard, ~30 blog posts per site,
  image generation, SEO keyword tooling.

### Prerequisite

Plans 1 through 5 are complete but **uncommitted**. `HEAD` (ead724c) is still
the old single-city clone. None of this design is reachable until the
multi-tenant app is committed and deployed. That is phase 0.

## 3. Architecture

### 3.1 City attribution

This is the requirement Abdi stated most directly ("this is coming from the
Miami website"), so it gets the most careful treatment.

The city is resolved **server-side from the `Host` header inside the action**,
using the same resolution the proxy already performs:

```ts
// src/leads/attribution.ts  (pure, unit-tested)
export function cityFromHost(host: string, map: DomainsIndex): Attribution
```

The action reads the host via `await headers()` from `next/headers` and passes
it to that pure function.

**Correction to an earlier assumption in this design conversation.** An earlier
sketch bound the city key to the server action via `.bind(null, cityKey)` from
the form component and described it as untamperable. That is wrong. Per
`node_modules/next/dist/docs/01-app/02-guides/forms.md`, bound arguments from a
client component round-trip through the browser, and
`.../02-guides/server-actions.md` states plainly: "Treat every action as an
untrusted entry point... a client legitimately tells the server *which* item to
act on, but it should not supply the row's contents or ownership." Reading the
Host header inside the action is not subject to that, and has the additional
property of being *guaranteed consistent* with the city whose pages were
actually rendered, because it is the same input the proxy rewrote on.

**Preview submissions.** Draft cities are previewed at internal `/<cityKey>/`
paths on the default host. There, `cityFromHost` returns no mapping, because the
default host is not a tenant domain. In exactly that case the action falls back
to a city key bound to the form by the rendering server component, saves the row
with `isTest: true`, and **sends no email**. Test rows are hidden from the
dashboard behind a toggle.

The bound value is client-influenceable, which is why it is used *only* on this
branch: a tampered value can produce a test row attributed to the wrong city and
nothing else. Real leads on real domains never consult it. This keeps draft
previews genuinely testable without weakening attribution where it matters.

### 3.2 Data model

Three tables. Prisma schema, `prisma/schema.prisma`:

```prisma
enum FormType     { booking contact }
enum LeadStatus   { new contacted quoted booked lost }
enum EmailStatus  { pending sent failed skipped }

model Lead {
  id          String      @id @default(uuid())
  cityKey     String
  formType    FormType
  name        String?
  email       String?
  phone       String?
  payload     Json                          // every submitted field, verbatim
  status      LeadStatus  @default(new)
  notes       String      @default("")
  emailStatus EmailStatus @default(pending)
  emailError  String?
  isTest      Boolean     @default(false)
  ipHash      String?
  submittedAt DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([cityKey, submittedAt(sort: Desc)])
  @@index([status, submittedAt(sort: Desc)])
  @@index([submittedAt(sort: Desc)])
}

model SiteSettings {
  cityKey      String   @id
  notifyEmails String[] @default([])
  updatedAt    DateTime @updatedAt
}

model DomainMapping {
  host      String   @id                    // lowercase, no port
  cityKey   String
  createdAt DateTime @default(now())

  @@index([cityKey])
}
```

Three deliberate calls:

**`payload` is the whole submission, and `name`/`email`/`phone` are lifted out
of it.** The booking form has 10 fields and the contact form has 5; a shared
column-per-field schema would be mostly nulls. Lifting the three fields the
list view sorts and searches on keeps queries simple without parsing JSON.

**`SiteSettings` is not a second city registry.** It holds notification config
only. `content/_cities.json` plus the city JSON documents remain the single
source of truth for which cities exist. The dashboard joins the two. Two
registries would drift.

**`DomainMapping` replaces the `hosts` object in `content/_domains.json`**, but
that file stays in the repo as a build-time fallback. See §3.6.

### 3.3 Submission path

Order of operations, and the reasoning for it:

1. Honeypot check. A hidden field that must be empty. Fails silently with a
   success response, so bots learn nothing.
2. Rate limit. Count non-test leads sharing this `ipHash` in the last 10
   minutes; over the threshold, reject. One extra indexed query per submission,
   acceptable at this volume and avoids a second table. `ipHash` is
   SHA-256 over the client IP plus a server-held salt (`IP_HASH_SALT`), so the
   database never holds a raw IP and the values are not reversible by dictionary
   attack over the IPv4 space.
3. Validate with Zod (already a dependency). Shape only.
4. Resolve city from `Host` (§3.1).
5. **Insert the lead.** Status `new`, `emailStatus` `pending`.
6. Look up that city's `notifyEmails`. Empty means `emailStatus: skipped`.
7. Send via Resend. Success sets `sent`; failure sets `failed` and stores the
   provider error in `emailError`.
8. Return success to the client.

**Step 5 precedes step 7 deliberately.** If Resend is down, the domain is not
yet verified, or the inbox is misconfigured, the lead is already durable and
the row carries a visible `failed` flag. A broken notification path must never
lose a customer. This is the single most important ordering constraint in the
design.

A failure in step 6 or 7 does **not** fail the submission. The customer sees
success, because from their point of view it was.

**Framework mechanics.** The forms are client components (`BookingForm.tsx`
holds `useState`). They call a Server Action defined in
`src/app/(sites)/[city]/lead-actions.ts` with `'use server'`. Per the Next 16
server-actions guide, framework-level CSRF (Origin vs Host) and a 1MB body cap
apply automatically; neither needs configuration here, and both are additional
to, not a substitute for, the validation above.

`serverActions.allowedOrigins` needs review once real custom domains are
attached, since every tenant domain posts to itself. Flagged in §11.

### 3.4 Email

One verified sending domain for all cities, configured as `LEADS_FROM_EMAIL`.
Recipients come from `SiteSettings.notifyEmails` per city.

```
From:     Ivy Cleans Leads <leads@{verified-domain}>
To:       (that city's notifyEmails)
Reply-To: (the customer's email, when supplied)
Subject:  [Miami] New booking request — Dana Whitfield
```

`Reply-To` set to the customer means Abdi can answer from his mail client
without opening the dashboard. The body lists every submitted field and links
to the lead in the dashboard.

**Why not per-city sending domains** (the position D7 reverses): each one costs
SPF and DKIM records at the registrar plus a Resend verification on every
launch, forever, and introduces a window where a live site collects leads while
its domain is unverified. The benefit that normally justifies that cost is
deliverability and brand trust with *customers*, and no customer ever receives
these emails. If a city later needs customer-facing mail from its own domain,
it can be added for that city alone without changing this design.

Body construction is a pure function in `src/leads/email.ts` returning
`{ subject, html, text }`, so it is unit-testable without a provider.

### 3.5 Admin screens

The admin layout gains two tabs. Existing routes keep their paths so nothing
already built moves.

| Route | Screen |
|-------|--------|
| `{ADMIN_BASE}` | **Sites**. Existing Cities table plus Domain, New leads, Email config columns |
| `{ADMIN_BASE}/leads` | **Leads**. Cross-site list, filtered by URL search params |
| `{ADMIN_BASE}/leads/[id]` | **Lead detail**. Fields, 5 status buttons, notes, delivery status |
| `{ADMIN_BASE}/sites/[key]` | **Site settings**. Domain mapping and notification inboxes |

**Filters live in the URL**: `?city=miami&status=contacted&form=booking`. The
server component reads `searchParams` and queries accordingly. This is why no
client state library is needed, and it makes any view bookmarkable and
shareable. Invalid values fall back to the unfiltered default rather than
erroring.

**Mutations** (status change, notes, settings) are Server Actions that call
`revalidatePath` on the affected route. Per the Next 16 server-actions guide,
that re-renders the route inside the same response, so the list reflects the
change without a follow-up fetch.

**Sites screen readiness chips** answer one question: is this site actually able
to deliver a lead? Derived, not stored:

- `LIVE` / `DRAFT` — existing status, unchanged
- domain attached in `DomainMapping`, or "not attached"
- `NO INBOX` when `notifyEmails` is empty — leads save but notify nobody
- a count of leads with `emailStatus: failed`

Presentational pieces reuse `src/app/admin-.../ui.tsx` (`StatusChip`, `Panel`,
`BTN`, `INPUT`). New chips are added there, not invented per screen.

Two existing repo conventions apply to all new admin copy: apostrophes render
U+2019 (`&rsquo;`), and no em dashes in UI copy.

### 3.6 Runtime domain map

Today `content/_domains.json` is a build-time import, and `_cities.json` is
inlined into the proxy chunk. Attaching a domain therefore requires a commit and
a redeploy, which means Abdi cannot launch a site without the user.

**This is the highest-risk part of the design**, because the host map is read on
every request to every site. A database query per request is not acceptable on
latency or cost.

Design:

- `src/content/domain-map.ts` exposes `getDomainMap(): Promise<DomainsIndex>`.
- Module-scope cache with a 60-second TTL. On expiry, one query refreshes it.
- **Fallback chain**: cache, then Postgres, then the bundled
  `content/_domains.json`. A database outage degrades to the last deployed
  mapping rather than taking every site down.
- The proxy runs on the Node.js runtime by default in Next 16
  (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`:
  "Proxy defaults to using the Node.js runtime"), and the `runtime` config
  option is unavailable there, so no edge-compatibility constraint applies.
- Prisma is **not** used in the proxy. A single lightweight query through
  `@neondatabase/serverless` keeps the proxy path small.

**Accepted trade-off:** up to 60 seconds between mapping a domain and every
instance serving it. DNS propagation dwarfs that, so it is not user-visible.

`resolveRewrite()` stays pure and unit-tested; only its input changes from a
static import to an awaited map.

## 4. Module layout

Logic sits in framework-free modules, matching `src/pipeline/admin-logic.ts`.

```
src/leads/
  types.ts          Lead, Attribution, filter shapes
  schema.ts         Zod schemas for both forms
  attribution.ts    cityFromHost() — pure
  email.ts          buildLeadEmail() — pure
  spam.ts           honeypot + rate-limit decision — pure
  store.ts          the ONLY module that touches Prisma
src/content/
  domain-map.ts     cached host map with fallback chain
prisma/schema.prisma
```

Every pure module is testable with no database, no network, and no framework.
`store.ts` is the single seam, which is what keeps D3 (Prisma) reversible: an
ORM swap touches that file and the schema, not the actions, screens, or tests.

## 5. Error handling

| Failure | Behaviour |
|---------|-----------|
| Validation fails | Field-level errors returned, nothing written |
| Honeypot filled | Success returned to the client, nothing written |
| Rate limited | Generic failure, nothing written |
| Host unmapped | Saved as `isTest: true`, no email |
| DB insert fails | Error shown, customer told to call, phone and email displayed |
| `notifyEmails` empty | Lead saved, `emailStatus: skipped`, surfaced as `NO INBOX` |
| Resend fails | Lead saved, `emailStatus: failed`, `emailError` stored, customer still sees success |
| Domain map query fails | Falls back to bundled JSON, sites keep serving |

The customer-facing success state replaces `ComingSoonPanel`. Its "call us
instead" copy is retained but reused for the DB-insert failure case, which is
the only case where the lead genuinely did not survive.

## 6. Testing

Follows the existing pattern: Vitest, stub the outside world with an env flag
(`STUB_MODEL=1` today; add `STUB_EMAIL=1`).

- **Pure units**: `attribution` (host to city, unmapped, port-suffixed,
  case-variant hosts), `schema` (both forms, missing and malformed fields),
  `email` (subject format, city label, reply-to, both form types), `spam`
  (honeypot, rate-limit boundaries).
- **Store**: against a real Neon test database, or a per-test transaction that
  rolls back. Table-driven for filter combinations.
- **Action**: the full order of operations with a stubbed store and stubbed
  email, asserting the constraint that matters most — *a failing email still
  leaves a saved lead with `emailStatus: failed`*.
- **Domain map**: TTL expiry, DB failure falling back to bundled JSON, cache hit
  issuing no query.
- **E2E**: extend `scripts/admin-e2e.mjs` with submit-to-visible-in-dashboard
  for both forms, a status transition, and a note.
- **Regression**: the HTML crawler must stay `EQUIVALENT` on public routes. The
  public sites must not change visually.

## 7. Build sequence

Each phase is independently useful and independently shippable.

| Phase | Contents | Value when it ships |
|-------|----------|---------------------|
| 0 | Commit and deploy plans 1 to 5 | The multi-tenant app is real |
| 1 | Schema, Prisma, live forms, action, attribution, validation, spam, success state | Leads land in Postgres, visible in Prisma Studio |
| 2 | Resend, `SiteSettings`, failure flagging | Abdi gets emails, before any dashboard exists |
| 3 | Leads tab, filters, lead detail, statuses, notes | The CRM Abdi described |
| 4 | Sites tab extensions, readiness chips | Misconfigured sites become visible |
| 5 | Runtime domain map | Publishing stops needing a redeploy |

## 8. Configuration

New in `.env.local` and Vercel, added to `.env.local.example`:

```
DATABASE_URL=          # Neon pooled connection string
RESEND_API_KEY=
LEADS_FROM_EMAIL=      # e.g. leads@<verified-domain>
IP_HASH_SALT=          # random, stable per environment
STUB_EMAIL=1           # local and test only
```

`IP_HASH_SALT` must stay stable within an environment or rate limiting silently
stops matching prior submissions. It does not need to match across
environments.

Per-city launch checklist, in order:

1. Generate, review, publish the city (exists today)
2. Buy the domain, add it to the **existing** Vercel project, set the DNS
   records Vercel supplies
3. Map host to city in Site settings
4. Set that city's notification inboxes
5. Confirm the Sites row shows no `NO INBOX` chip

Steps 3 and 4 are dashboard forms after phase 5; before it, step 3 is a commit.

## 9. What does not change

- No visual change to any public site. The clone stays pixel-accurate.
- No change to the AI generation pipeline.
- No new deployment per city. One repo, one Vercel project, one database.
- City JSON documents remain the source of truth for content.

## 10. Security posture

Stated plainly because D6 is a deliberate, informed choice.

The dashboard will hold customer names, phone numbers, email addresses, home
addresses, and service details across every city. The only access control is
the unguessable admin path. Anyone who obtains that URL — a screenshot, a
shared bookmark, browser history on a shared machine — can read every
customer's contact details.

This was raised before the decision was made and the user chose to proceed.
Mitigations that are in scope regardless:

- Server Actions for admin mutations are as reachable as the pages. Every
  mutating action validates its inputs and, once auth exists, must check it.
  This is the concrete reason to keep all mutations in one small action module.
- `ipHash` is a hash, never a raw IP.
- The public sites never expose lead data.

Adding a session check later is additive: one gate in the admin layout plus one
check per action. It does not require reworking the schema or the screens.

## 11. Open items

1. **Rotate the Neon password.** The live connection string was pasted into a
   chat transcript on 2026-08-21. Reset the role password in the Neon console,
   update `.env.local` and Vercel. `.env*` is already gitignored.
2. **Confirm D7 with Abdi.** One sending domain versus per-city sending domains
   is the one decision here that reverses a stated user preference, on the
   grounds that no transcript supports the more expensive option.
3. **`serverActions.allowedOrigins`** needs verifying once two real custom
   domains are attached.
4. **Rate-limit threshold** is unset. Pick a number in phase 1 from expected
   volume; a cleaning site should never see legitimate double-digit submissions
   per IP per hour.
5. **Retry for `emailStatus: failed`** is out of scope. Phase 3 shows the flag;
   a resend button is a candidate follow-up.
6. **`.superpowers/` is not in `.gitignore`.** Brainstorming mockups are written
   there.
