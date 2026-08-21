# Leads Capture and CRM Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make both public forms capture real leads into Postgres, email the originating city's inbox, and expose every lead across every city in the admin as a light CRM.

**Architecture:** A pure, framework-free core (`src/leads/*`) does validation, attribution, spam checks, email composition and orchestration. A thin `'use server'` adapter is the only framework surface on the capture path, and `src/leads/store.ts` is the only module that touches Prisma. The admin gains a Leads tab reading through the same store, with filter state carried in URL search params.

**Tech Stack:** Next.js 16.2.12 (App Router, Server Actions), React 19.2.4, TypeScript, Prisma + Neon Postgres, Resend, Zod 4, Vitest 4, Tailwind 4, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-21-leads-crm-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Commit each task on the `feat/leads-crm` branch when it passes review** (user-approved 2026-08-21, superseding this plan's original no-commit constraint). Per-task commits are what let each review see exactly one task's diff. `main` is untouched; the branch stays the user's to squash, reset, or discard. Implementers still stage and stop: the controller commits after review, so an unreviewed change never lands.
- **Phase 0 is a prerequisite outside this plan.** Plans 1 to 5 are complete but uncommitted; `HEAD` (ead724c) is still the old single-city site. This plan's code sits on top of that uncommitted work in the same working tree.
- **Public sites must not change visually.** The HTML crawler must report `EQUIVALENT` on all public routes at the end. The only permitted change to public markup is the addition of a hidden honeypot input and the form's post-submit state.
- **Apostrophes in JSX copy must render U+2019** — use `&rsquo;` or a literal `’`. A straight `'` fails lint and mismatches the live copy (`AGENTS.md`).
- **No em dashes in admin UI copy.** Standing user preference.
- **Never use default Tailwind rem utilities for sizes on public pages** (`text-sm`, `p-4`). The root font-size ladder in `src/app/globals.css` rescales them. Admin pages are exempt: `admin.css` resets the ladder via `:root:has([data-admin-root])`.
- **All user-visible copy on public pages lives in `src/data/*.ts`**, byte-verbatim from the reference dumps. New copy introduced by this plan (the success panel) is OUR content and is exempt, but goes in `src/data/*.ts` anyway.
- **Tests:** Vitest, `pnpm test`. `fileParallelism: false` is set because suites share the real `content/` directory. Follow the existing convention from `tests/admin-logic.test.ts`: every row a test creates uses a `ztest-` prefixed `cityKey`, and `afterAll` deletes them unconditionally.
- **Rate limit threshold: 5 non-test submissions per IP hash per 10 minutes.** This resolves spec open item 4.
- **Stub flags:** `STUB_MODEL=1` exists for the AI pipeline. This plan adds `STUB_EMAIL=1`, which must be set for the whole test suite so no test can reach Resend.

---

## File Structure

**New — pure core (no framework, no I/O except `store.ts`):**

| File | Responsibility |
|------|----------------|
| `src/leads/types.ts` | Shared types. No logic. |
| `src/leads/schema.ts` | Zod schemas + `FormData` extraction for both forms |
| `src/leads/attribution.ts` | Host to city, and whether the row is a test row |
| `src/leads/spam.ts` | Honeypot and rate-limit decisions |
| `src/leads/email.ts` | Builds the notification email body. Pure. |
| `src/leads/mailer.ts` | Resend adapter. The only module that talks to Resend. |
| `src/leads/store.ts` | The only module that touches Prisma |
| `src/leads/submit.ts` | Orchestration. Dependency-injected, so it is testable with fakes. |
| `src/leads/filters.ts` | `searchParams` to a validated `LeadQuery` |
| `src/leads/readiness.ts` | Derives per-site launch-readiness flags |

**New — framework surface:**

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Schema |
| `src/app/(sites)/[city]/lead-actions.ts` | `'use server'`. Reads headers, calls `submitLead`. |
| `src/app/admin-x7kq92mpfw4rt8vz/leads/page.tsx` | Leads list |
| `src/app/admin-x7kq92mpfw4rt8vz/leads/[id]/page.tsx` | Lead detail |
| `src/app/admin-x7kq92mpfw4rt8vz/leads/lead-actions.ts` | `'use server'`. Status and notes. |
| `src/app/admin-x7kq92mpfw4rt8vz/sites/[key]/page.tsx` | Per-site notification settings |

**Modified:**

| File | Change |
|------|--------|
| `src/components/book/BookingForm.tsx:74,153` | Real submit instead of `setSubmitted(true)` |
| `src/components/book/ComingSoonPanel.tsx` | Becomes `SubmitResultPanel` with success and failure states |
| `src/components/book/BookNowSection.tsx:45`, `BookSection.tsx:136` | Thread `cityKey` |
| `src/components/contact/ContactFormDisplay.tsx:78` | Becomes a client component with a real submit |
| `src/app/(sites)/[city]/(inner)/contact/page.tsx:69` | Thread `cityKey` |
| `src/app/admin-x7kq92mpfw4rt8vz/layout.tsx` | Sites / Leads tabs |
| `src/app/admin-x7kq92mpfw4rt8vz/page.tsx` | Domain, lead count, email config columns |
| `src/app/admin-x7kq92mpfw4rt8vz/ui.tsx` | `LeadStatusChip`, `ReadinessChip` |
| `src/data/book.ts`, `src/data/contact.ts` | Success panel copy |
| `package.json` | Prisma deps, `prisma generate` in build |
| `.env.local.example` | New variables |

**Tests:** one file per pure module plus `tests/leads-store.test.ts`, `tests/leads-submit.test.ts`.

---

### Task 1: Prisma, schema, and the store seam

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/leads/types.ts`
- Create: `src/leads/store.ts`
- Modify: `package.json`, `.env.local.example`
- Test: `tests/leads-store.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: every type in `types.ts`, and the store functions listed in step 5. All later tasks depend on these exact names.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add @prisma/client
pnpm add -D prisma
```

- [ ] **Step 2: Add environment variables**

Append to `.env.local.example`:

```
# Neon Postgres. DATABASE_URL is the POOLED connection string (host contains
# "-pooler"); DIRECT_DATABASE_URL is the direct one, which Prisma Migrate
# requires because migrations cannot run over a pooled connection.
DATABASE_URL=
DIRECT_DATABASE_URL=

# Resend
RESEND_API_KEY=
LEADS_FROM_EMAIL=

# Random, stable per environment. Changing it silently resets rate limiting.
IP_HASH_SALT=

# Local and test only: routes every notification email to an in-memory sink.
STUB_EMAIL=1
```

Set the real values in `.env.local` (already gitignored via `.env*`).

- [ ] **Step 3: Write the schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}

enum FormType {
  booking
  contact
}

enum LeadStatus {
  new
  contacted
  quoted
  booked
  lost
}

enum EmailStatus {
  pending
  sent
  failed
  skipped
}

model Lead {
  id          String      @id @default(uuid())
  cityKey     String
  formType    FormType
  name        String?
  email       String?
  phone       String?
  payload     Json
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
  @@index([ipHash, submittedAt(sort: Desc)])
}

model SiteSettings {
  cityKey      String   @id
  notifyEmails String[] @default([])
  updatedAt    DateTime @updatedAt
}
```

`DomainMapping` from the spec is deliberately NOT here. It belongs to phase 5, which is a separate plan.

- [ ] **Step 4: Wire generate into the build and push the schema**

In `package.json` scripts, change `"build"` and add `"postinstall"`:

```json
"build": "prisma generate && next build",
"postinstall": "prisma generate",
```

Then:

```bash
pnpm prisma db push
pnpm prisma generate
```

Expected: `db push` reports the three enums and two tables created.

- [ ] **Step 5: Write the failing store test**

Create `tests/leads-store.test.ts`:

```ts
// tests/leads-store.test.ts
/*
 * The leads store, against the real Neon database.
 *
 * Follows tests/admin-logic.test.ts's convention: every row this file creates
 * uses a `ztest-` prefixed cityKey, and afterAll deletes them unconditionally
 * so a failed run cannot leave rows behind. Skipped entirely when
 * DATABASE_URL is absent so the rest of the suite still runs.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  countRecentByIpHash,
  createLead,
  getLead,
  leadCountsByCity,
  listLeads,
  markLeadEmail,
  setLeadNotes,
  setLeadStatus,
  getSiteSettings,
  upsertSiteSettings,
} from '../src/leads/store'
import type { LeadInput } from '../src/leads/types'

const CITY = 'ztest-miami'
const OTHER = 'ztest-houston'
const prisma = new PrismaClient()

function input(over: Partial<LeadInput> = {}): LeadInput {
  return {
    cityKey: CITY,
    formType: 'booking',
    name: 'Dana Whitfield',
    email: 'dana@example.com',
    phone: '305-555-0184',
    payload: { service: 'Deep Cleaning', bedrooms: '3' },
    isTest: false,
    ipHash: 'hash-a',
    ...over,
  }
}

afterAll(async () => {
  await prisma.lead.deleteMany({ where: { cityKey: { startsWith: 'ztest-' } } })
  await prisma.siteSettings.deleteMany({ where: { cityKey: { startsWith: 'ztest-' } } })
  await prisma.$disconnect()
})

describe.skipIf(!process.env.DATABASE_URL)('leads store', () => {
  beforeEach(async () => {
    await prisma.lead.deleteMany({ where: { cityKey: { startsWith: 'ztest-' } } })
    await prisma.siteSettings.deleteMany({ where: { cityKey: { startsWith: 'ztest-' } } })
  })

  it('creates a lead defaulted to new and pending', async () => {
    const lead = await createLead(input())
    expect(lead.id).toBeTruthy()
    expect(lead.status).toBe('new')
    expect(lead.emailStatus).toBe('pending')
    expect(lead.payload).toEqual({ service: 'Deep Cleaning', bedrooms: '3' })
  })

  it('marks email delivery outcome with an error string', async () => {
    const lead = await createLead(input())
    await markLeadEmail(lead.id, 'failed', 'domain not verified')
    const after = await getLead(lead.id)
    expect(after?.emailStatus).toBe('failed')
    expect(after?.emailError).toBe('domain not verified')
  })

  it('filters by city, status and form type, newest first', async () => {
    await createLead(input())
    await createLead(input({ cityKey: OTHER, formType: 'contact', name: 'Marcus' }))
    const miami = await listLeads({ city: CITY, status: null, formType: null, includeTest: false })
    expect(miami).toHaveLength(1)
    expect(miami[0].name).toBe('Dana Whitfield')

    const contacts = await listLeads({ city: null, status: null, formType: 'contact', includeTest: false })
    expect(contacts.map((l) => l.name)).toEqual(['Marcus'])
  })

  it('hides test rows unless asked for them', async () => {
    await createLead(input({ isTest: true, name: 'Preview Person' }))
    const hidden = await listLeads({ city: CITY, status: null, formType: null, includeTest: false })
    expect(hidden).toHaveLength(0)
    const shown = await listLeads({ city: CITY, status: null, formType: null, includeTest: true })
    expect(shown).toHaveLength(1)
  })

  it('updates status and notes independently', async () => {
    const lead = await createLead(input())
    await setLeadStatus(lead.id, 'contacted')
    await setLeadNotes(lead.id, 'Call back Thu')
    const after = await getLead(lead.id)
    expect(after?.status).toBe('contacted')
    expect(after?.notes).toBe('Call back Thu')
  })

  it('counts recent leads for one ip hash, ignoring test rows', async () => {
    await createLead(input({ ipHash: 'hash-b' }))
    await createLead(input({ ipHash: 'hash-b' }))
    await createLead(input({ ipHash: 'hash-b', isTest: true }))
    expect(await countRecentByIpHash('hash-b', 10 * 60_000)).toBe(2)
  })

  it('aggregates counts per city', async () => {
    const a = await createLead(input())
    await createLead(input({ cityKey: OTHER }))
    await markLeadEmail(a.id, 'failed', 'boom')
    const counts = await leadCountsByCity()
    expect(counts[CITY]).toEqual({ total: 1, unworked: 1, emailFailed: 1 })
    expect(counts[OTHER]).toEqual({ total: 1, unworked: 1, emailFailed: 0 })
  })

  it('upserts site settings', async () => {
    await upsertSiteSettings(CITY, ['miami@example.com'])
    await upsertSiteSettings(CITY, ['miami@example.com', 'ops@example.com'])
    const settings = await getSiteSettings(CITY)
    expect(settings?.notifyEmails).toEqual(['miami@example.com', 'ops@example.com'])
    expect(await getSiteSettings('ztest-nope')).toBeNull()
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm vitest run tests/leads-store.test.ts`
Expected: FAIL, cannot resolve `../src/leads/store`.

- [ ] **Step 7: Write the types**

Create `src/leads/types.ts`:

```ts
// src/leads/types.ts
/*
 * Shared vocabulary for the leads feature. Deliberately free of Prisma types:
 * store.ts maps between these and the generated client, so every other module
 * (and every test) can be written without a database in scope.
 */

export type FormType = 'booking' | 'contact'
export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'booked' | 'lost'
export type EmailStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export const LEAD_STATUSES: readonly LeadStatus[] = [
  'new',
  'contacted',
  'quoted',
  'booked',
  'lost',
]

/** A lead as it arrives, before the database assigns identity or defaults. */
export type LeadInput = {
  cityKey: string
  formType: FormType
  name: string | null
  email: string | null
  phone: string | null
  /** Every submitted field, label-keyed, verbatim. */
  payload: Record<string, string>
  isTest: boolean
  ipHash: string | null
}

/** A stored lead. */
export type LeadRecord = LeadInput & {
  id: string
  status: LeadStatus
  notes: string
  emailStatus: EmailStatus
  emailError: string | null
  submittedAt: Date
  updatedAt: Date
}

/** A validated dashboard query. Produced only by filters.ts. */
export type LeadQuery = {
  city: string | null
  status: LeadStatus | null
  formType: FormType | null
  includeTest: boolean
}

export type LeadCounts = {
  total: number
  /** Leads not yet booked or lost, i.e. still needing action. */
  unworked: number
  emailFailed: number
}

export type SiteSettingsRecord = {
  cityKey: string
  notifyEmails: string[]
}
```

- [ ] **Step 8: Write the store**

Create `src/leads/store.ts`:

```ts
// src/leads/store.ts
/*
 * The ONLY module in the codebase that imports Prisma.
 *
 * Everything above it speaks in src/leads/types.ts, which is why the ORM
 * choice stays reversible: swapping Prisma out touches this file and
 * prisma/schema.prisma, not the actions, the screens, or their tests.
 */
import { PrismaClient, type Lead as PrismaLead } from '@prisma/client'
import type {
  EmailStatus,
  LeadCounts,
  LeadInput,
  LeadQuery,
  LeadRecord,
  LeadStatus,
  SiteSettingsRecord,
} from './types'

/*
 * One client per process. Next's dev server re-evaluates modules on every
 * edit, which would otherwise open a new pool per reload until Neon refuses
 * connections, so the instance is parked on globalThis in development.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

function toRecord(row: PrismaLead): LeadRecord {
  return {
    id: row.id,
    cityKey: row.cityKey,
    formType: row.formType,
    name: row.name,
    email: row.email,
    phone: row.phone,
    payload: (row.payload ?? {}) as Record<string, string>,
    status: row.status,
    notes: row.notes,
    emailStatus: row.emailStatus,
    emailError: row.emailError,
    isTest: row.isTest,
    ipHash: row.ipHash,
    submittedAt: row.submittedAt,
    updatedAt: row.updatedAt,
  }
}

export async function createLead(input: LeadInput): Promise<LeadRecord> {
  const row = await prisma.lead.create({
    data: {
      cityKey: input.cityKey,
      formType: input.formType,
      name: input.name,
      email: input.email,
      phone: input.phone,
      payload: input.payload,
      isTest: input.isTest,
      ipHash: input.ipHash,
    },
  })
  return toRecord(row)
}

export async function markLeadEmail(
  id: string,
  status: EmailStatus,
  error: string | null = null,
): Promise<void> {
  await prisma.lead.update({
    where: { id },
    data: { emailStatus: status, emailError: error },
  })
}

export async function listLeads(query: LeadQuery): Promise<LeadRecord[]> {
  const rows = await prisma.lead.findMany({
    where: {
      ...(query.city ? { cityKey: query.city } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.formType ? { formType: query.formType } : {}),
      ...(query.includeTest ? {} : { isTest: false }),
    },
    orderBy: { submittedAt: 'desc' },
    take: 200,
  })
  return rows.map(toRecord)
}

export async function getLead(id: string): Promise<LeadRecord | null> {
  const row = await prisma.lead.findUnique({ where: { id } })
  return row ? toRecord(row) : null
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<void> {
  await prisma.lead.update({ where: { id }, data: { status } })
}

export async function setLeadNotes(id: string, notes: string): Promise<void> {
  await prisma.lead.update({ where: { id }, data: { notes } })
}

export async function countRecentByIpHash(ipHash: string, windowMs: number): Promise<number> {
  return prisma.lead.count({
    where: {
      ipHash,
      isTest: false,
      submittedAt: { gte: new Date(Date.now() - windowMs) },
    },
  })
}

export async function leadCountsByCity(): Promise<Record<string, LeadCounts>> {
  const rows = await prisma.lead.findMany({
    where: { isTest: false },
    select: { cityKey: true, status: true, emailStatus: true },
  })
  const out: Record<string, LeadCounts> = {}
  for (const row of rows) {
    const bucket = (out[row.cityKey] ??= { total: 0, unworked: 0, emailFailed: 0 })
    bucket.total += 1
    if (row.status !== 'booked' && row.status !== 'lost') bucket.unworked += 1
    if (row.emailStatus === 'failed') bucket.emailFailed += 1
  }
  return out
}

export async function getSiteSettings(cityKey: string): Promise<SiteSettingsRecord | null> {
  const row = await prisma.siteSettings.findUnique({ where: { cityKey } })
  return row ? { cityKey: row.cityKey, notifyEmails: row.notifyEmails } : null
}

export async function upsertSiteSettings(cityKey: string, notifyEmails: string[]): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { cityKey },
    create: { cityKey, notifyEmails },
    update: { notifyEmails },
  })
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `pnpm vitest run tests/leads-store.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 10: Stage, do not commit**

```bash
git add prisma package.json pnpm-lock.yaml .env.local.example src/leads tests/leads-store.test.ts
```

---

### Task 2: Form schemas and field extraction

**Files:**
- Create: `src/leads/schema.ts`
- Test: `tests/leads-schema.test.ts`

**Interfaces:**
- Consumes: `LeadInput`, `FormType` from `src/leads/types.ts`.
- Produces: `HONEYPOT_FIELD`, `parseBookingForm(form: FormData): ParseResult`, `parseContactForm(form: FormData): ParseResult`, `type ParseResult = { ok: true; fields: ParsedFields } | { ok: false; fieldErrors: Record<string, string> }`, `type ParsedFields = { name, email, phone, payload }`.

Field names come from the live Elementor markup and are already in the data
files. Booking (`src/data/book.ts`): `form_fields[name]`, `form_fields[email]`,
`form_fields[field_ca2243e]` (phone), plus six others. Contact
(`src/components/contact/ContactFormDisplay.tsx:96` builds them): the `id`
minus its `form-field-` prefix, giving `name`, `email`, `field_66433ea`
(phone), `message`, `field_45db7dd`.

- [ ] **Step 1: Write the failing test**

Create `tests/leads-schema.test.ts`:

```ts
// tests/leads-schema.test.ts
import { describe, expect, it } from 'vitest'
import { HONEYPOT_FIELD, parseBookingForm, parseContactForm } from '../src/leads/schema'

function booking(over: Record<string, string> = {}): FormData {
  const f = new FormData()
  f.set('form_fields[field_22aa910]', 'Deep Cleaning ( Most Popular Option)')
  f.set('form_fields[message]', 'Slightly Dirty (Nothing crazy)')
  f.set('form_fields[field_c4cfac1]', '3')
  f.set('form_fields[field_caacb3a]', '2')
  f.set('form_fields[field_1abcd81]', 'Sometime this week')
  f.set('form_fields[field_1872bc3]', '1420 Brickell Ave')
  f.set('form_fields[name]', 'Dana Whitfield')
  f.set('form_fields[email]', 'dana@example.com')
  f.set('form_fields[field_ca2243e]', '305-555-0184')
  f.set('form_fields[field_deeaf01]', 'Call Me')
  for (const [k, v] of Object.entries(over)) f.set(k, v)
  return f
}

function contact(over: Record<string, string> = {}): FormData {
  const f = new FormData()
  f.set('form_fields[name]', 'Alicia Gordon')
  f.set('form_fields[email]', 'alicia@example.com')
  f.set('form_fields[field_66433ea]', '(305) 555-0199')
  f.set('form_fields[field_45db7dd]', 'Yes')
  f.set('form_fields[message]', 'Weekly service for a condo in Brickell?')
  for (const [k, v] of Object.entries(over)) f.set(k, v)
  return f
}

describe('parseBookingForm', () => {
  it('lifts name, email and phone and keeps every field in the payload', () => {
    const result = parseBookingForm(booking())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.name).toBe('Dana Whitfield')
    expect(result.fields.email).toBe('dana@example.com')
    expect(result.fields.phone).toBe('305-555-0184')
    expect(result.fields.payload['What Type of Service Are Your Looking For?']).toBe(
      'Deep Cleaning ( Most Popular Option)',
    )
    expect(Object.keys(result.fields.payload)).toHaveLength(10)
  })

  it('rejects a missing name', () => {
    const result = parseBookingForm(booking({ 'form_fields[name]': '' }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.fieldErrors['form_fields[name]']).toBeTruthy()
  })

  it('rejects a malformed email', () => {
    const result = parseBookingForm(booking({ 'form_fields[email]': 'not-an-email' }))
    expect(result.ok).toBe(false)
  })

  it('trims whitespace', () => {
    const result = parseBookingForm(booking({ 'form_fields[name]': '  Dana  ' }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.name).toBe('Dana')
  })
})

describe('parseContactForm', () => {
  it('lifts the three identity fields and labels the payload', () => {
    const result = parseContactForm(contact())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.name).toBe('Alicia Gordon')
    expect(result.fields.phone).toBe('(305) 555-0199')
    expect(result.fields.payload['How Can We Help?']).toBe(
      'Weekly service for a condo in Brickell?',
    )
    expect(Object.keys(result.fields.payload)).toHaveLength(5)
  })

  it('accepts an empty optional phone', () => {
    const result = parseContactForm(contact({ 'form_fields[field_66433ea]': '' }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.phone).toBeNull()
  })
})

describe('honeypot', () => {
  it('exposes a field name that is not one of the real fields', () => {
    expect(HONEYPOT_FIELD).toBe('form_fields[website_url]')
    expect(booking().has(HONEYPOT_FIELD)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/leads-schema.test.ts`
Expected: FAIL, cannot resolve `../src/leads/schema`.

- [ ] **Step 3: Write the schema module**

Create `src/leads/schema.ts`:

```ts
// src/leads/schema.ts
/*
 * FormData in, validated fields out. Pure: no database, no framework.
 *
 * The `name` attributes below are the LIVE Elementor names, kept byte-exact
 * because the public markup is a fidelity clone and must not change. They are
 * opaque ids, so this module maps each one to its human label for the payload
 * — that label is what the dashboard and the notification email display.
 */
import { z } from 'zod'

export const HONEYPOT_FIELD = 'form_fields[website_url]'

export type ParsedFields = {
  name: string | null
  email: string | null
  phone: string | null
  payload: Record<string, string>
}

export type ParseResult =
  | { ok: true; fields: ParsedFields }
  | { ok: false; fieldErrors: Record<string, string> }

/** Live field name -> human label, in the order the form renders them. */
const BOOKING_FIELDS: readonly [string, string][] = [
  ['form_fields[field_22aa910]', 'What Type of Service Are Your Looking For?'],
  ['form_fields[message]', 'How Would Your Describe Your Home Right Now?'],
  ['form_fields[field_c4cfac1]', 'How Many Bedrooms?'],
  ['form_fields[field_caacb3a]', 'How Many Bathrooms?'],
  ['form_fields[field_1abcd81]', 'How Soon Are You Looking To Have This Cleaned?'],
  ['form_fields[field_1872bc3]', 'What’s the Address of the Property?'],
  ['form_fields[name]', 'Full Name'],
  ['form_fields[email]', 'Email Address'],
  ['form_fields[field_ca2243e]', 'Phone Number'],
  ['form_fields[field_deeaf01]', 'How Would You Prefer To Be Contacted?'],
]

const CONTACT_FIELDS: readonly [string, string][] = [
  ['form_fields[name]', 'Name'],
  ['form_fields[email]', 'Email'],
  ['form_fields[field_66433ea]', 'Phone Number'],
  ['form_fields[field_45db7dd]', 'Are You Looking For Help With A Cleaning Project?'],
  ['form_fields[message]', 'How Can We Help?'],
]

const identity = z.object({
  name: z.string().trim().min(1, 'Please enter your name').max(200),
  email: z.string().trim().email('Please enter a valid email address').max(320),
  phone: z.string().trim().max(50).optional().default(''),
})

function str(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function parse(
  form: FormData,
  fields: readonly [string, string][],
  nameKey: string,
  emailKey: string,
  phoneKey: string,
): ParseResult {
  const parsed = identity.safeParse({
    name: str(form, nameKey),
    email: str(form, emailKey),
    phone: str(form, phoneKey),
  })

  if (!parsed.success) {
    const byField: Record<string, string> = {}
    const keyFor = { name: nameKey, email: emailKey, phone: phoneKey } as const
    for (const issue of parsed.error.issues) {
      const which = issue.path[0] as keyof typeof keyFor
      byField[keyFor[which]] = issue.message
    }
    return { ok: false, fieldErrors: byField }
  }

  const payload: Record<string, string> = {}
  for (const [key, label] of fields) payload[label] = str(form, key)

  return {
    ok: true,
    fields: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone === '' ? null : parsed.data.phone,
      payload,
    },
  }
}

export function parseBookingForm(form: FormData): ParseResult {
  return parse(
    form,
    BOOKING_FIELDS,
    'form_fields[name]',
    'form_fields[email]',
    'form_fields[field_ca2243e]',
  )
}

export function parseContactForm(form: FormData): ParseResult {
  return parse(
    form,
    CONTACT_FIELDS,
    'form_fields[name]',
    'form_fields[email]',
    'form_fields[field_66433ea]',
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/leads-schema.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Stage, do not commit**

```bash
git add src/leads/schema.ts tests/leads-schema.test.ts
```

---

### Task 3: City attribution from the Host header

**Files:**
- Create: `src/leads/attribution.ts`
- Test: `tests/leads-attribution.test.ts`

**Interfaces:**
- Consumes: `DomainsIndex` from `src/content/resolve-rewrite.ts` (exported there already).
- Produces: `type Attribution = { cityKey: string; isTest: boolean }` and `attributeCity(host: string, renderedCityKey: string, domains: DomainsIndex): Attribution`.

This is the requirement Abdi stated most directly, so read the rules carefully:

1. Host is mapped in `domains.hosts` — that is a real tenant domain. Use the
   mapped city, `isTest: false`. The client cannot influence this.
2. Host is unmapped but `renderedCityKey` equals `domains.default` — the
   default host serving the default city, which is legitimate production
   traffic today because `content/_domains.json` currently has empty `hosts`.
   `isTest: false`.
3. Anything else — an internal `/<cityKey>/` draft preview. `isTest: true`,
   no email.

`renderedCityKey` is passed from the server component that rendered the form,
so it round-trips through the browser and is untrusted. It is consulted only in
cases 2 and 3, where the worst outcome is a test row labelled with the wrong
city. Case 1, which covers every real lead, never reads it.

- [ ] **Step 1: Write the failing test**

Create `tests/leads-attribution.test.ts`:

```ts
// tests/leads-attribution.test.ts
import { describe, expect, it } from 'vitest'
import { attributeCity } from '../src/leads/attribution'
import type { DomainsIndex } from '../src/content/resolve-rewrite'

const domains: DomainsIndex = {
  default: 'minneapolis',
  hosts: { 'miamicleans.com': 'miami', 'houstoncleans.com': 'houston' },
}

describe('attributeCity', () => {
  it('uses the mapped city for a tenant domain', () => {
    expect(attributeCity('miamicleans.com', 'anything', domains)).toEqual({
      cityKey: 'miami',
      isTest: false,
    })
  })

  it('ignores the rendered key entirely when the host is mapped', () => {
    expect(attributeCity('houstoncleans.com', 'miami', domains)).toEqual({
      cityKey: 'houston',
      isTest: false,
    })
  })

  it('lowercases the host and strips the port', () => {
    expect(attributeCity('MiamiCleans.com:3000', 'x', domains).cityKey).toBe('miami')
  })

  it('treats the default host serving the default city as real', () => {
    expect(attributeCity('ivycleans.com', 'minneapolis', domains)).toEqual({
      cityKey: 'minneapolis',
      isTest: false,
    })
  })

  it('treats an unmapped host rendering another city as a preview', () => {
    expect(attributeCity('localhost', 'testville', domains)).toEqual({
      cityKey: 'testville',
      isTest: true,
    })
  })

  it('treats an empty host as a preview', () => {
    expect(attributeCity('', 'miami', domains)).toEqual({ cityKey: 'miami', isTest: true })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/leads-attribution.test.ts`
Expected: FAIL, cannot resolve `../src/leads/attribution`.

- [ ] **Step 3: Write the implementation**

Create `src/leads/attribution.ts`:

```ts
// src/leads/attribution.ts
/*
 * Which city did this submission come from?
 *
 * Deliberately mirrors resolveRewrite()'s host normalization, because the
 * whole point is that a lead is attributed to the SAME city whose pages the
 * proxy just rendered. Divergence here would mean a customer filling in the
 * Miami site and landing in another city's list.
 *
 * `renderedCityKey` comes from the browser and is therefore untrusted. It is
 * read only when the host is not a tenant domain, where the worst outcome is a
 * test row with the wrong label. Every real lead is attributed from the Host
 * header alone.
 */
import type { DomainsIndex } from '../content/resolve-rewrite'

export type Attribution = {
  cityKey: string
  /** true = a draft preview submission: stored, hidden by default, never emailed. */
  isTest: boolean
}

export function attributeCity(
  host: string,
  renderedCityKey: string,
  domains: DomainsIndex,
): Attribution {
  const normalized = host.toLowerCase().split(':')[0]
  const mapped = domains.hosts[normalized]
  if (mapped) return { cityKey: mapped, isTest: false }
  if (renderedCityKey === domains.default) {
    return { cityKey: domains.default, isTest: false }
  }
  return { cityKey: renderedCityKey, isTest: true }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/leads-attribution.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Stage, do not commit**

```bash
git add src/leads/attribution.ts tests/leads-attribution.test.ts
```

---

### Task 4: Spam decisions and IP hashing

**Files:**
- Create: `src/leads/spam.ts`
- Test: `tests/leads-spam.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `RATE_LIMIT`, `RATE_WINDOW_MS`, `hashIp(ip: string | null, salt: string): string | null`, `spamVerdict(args: { honeypotValue: string | null; recentCount: number }): SpamVerdict`, `type SpamVerdict = { accept: true } | { accept: false; reason: 'honeypot' | 'rate-limit' }`.

- [ ] **Step 1: Write the failing test**

Create `tests/leads-spam.test.ts`:

```ts
// tests/leads-spam.test.ts
import { describe, expect, it } from 'vitest'
import { RATE_LIMIT, hashIp, spamVerdict } from '../src/leads/spam'

describe('hashIp', () => {
  it('is stable for the same ip and salt', () => {
    expect(hashIp('203.0.113.7', 'pepper')).toBe(hashIp('203.0.113.7', 'pepper'))
  })

  it('differs when the salt differs', () => {
    expect(hashIp('203.0.113.7', 'a')).not.toBe(hashIp('203.0.113.7', 'b'))
  })

  it('never returns the raw ip', () => {
    expect(hashIp('203.0.113.7', 'pepper')).not.toContain('203.0.113.7')
  })

  it('returns null when the ip is unknown', () => {
    expect(hashIp(null, 'pepper')).toBeNull()
  })
})

describe('spamVerdict', () => {
  it('accepts an empty honeypot under the limit', () => {
    expect(spamVerdict({ honeypotValue: '', recentCount: 0 })).toEqual({ accept: true })
  })

  it('accepts a missing honeypot field', () => {
    expect(spamVerdict({ honeypotValue: null, recentCount: 0 })).toEqual({ accept: true })
  })

  it('rejects a filled honeypot', () => {
    expect(spamVerdict({ honeypotValue: 'http://spam', recentCount: 0 })).toEqual({
      accept: false,
      reason: 'honeypot',
    })
  })

  it('accepts at exactly one below the limit', () => {
    expect(spamVerdict({ honeypotValue: '', recentCount: RATE_LIMIT - 1 })).toEqual({
      accept: true,
    })
  })

  it('rejects at the limit', () => {
    expect(spamVerdict({ honeypotValue: '', recentCount: RATE_LIMIT })).toEqual({
      accept: false,
      reason: 'rate-limit',
    })
  })

  it('checks the honeypot before the rate limit', () => {
    expect(spamVerdict({ honeypotValue: 'x', recentCount: 999 })).toEqual({
      accept: false,
      reason: 'honeypot',
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/leads-spam.test.ts`
Expected: FAIL, cannot resolve `../src/leads/spam`.

- [ ] **Step 3: Write the implementation**

Create `src/leads/spam.ts`:

```ts
// src/leads/spam.ts
/*
 * Two cheap guards on a public, unauthenticated endpoint.
 *
 * The honeypot is a field a human never sees and a naive bot always fills.
 * Failing it returns SUCCESS to the caller (see submit.ts) so the bot learns
 * nothing about why it was dropped.
 *
 * The IP is hashed with a server-held salt before it is ever stored: the
 * database must never hold a raw address, and an unsalted hash of an IPv4
 * address is trivially reversible by enumerating the whole space.
 */
import { createHash } from 'node:crypto'

/** Non-test submissions allowed per ip hash per window. */
export const RATE_LIMIT = 5
export const RATE_WINDOW_MS = 10 * 60_000

export type SpamVerdict = { accept: true } | { accept: false; reason: 'honeypot' | 'rate-limit' }

export function hashIp(ip: string | null, salt: string): string | null {
  if (!ip) return null
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}

export function spamVerdict(args: {
  honeypotValue: string | null
  recentCount: number
}): SpamVerdict {
  if (args.honeypotValue && args.honeypotValue.trim() !== '') {
    return { accept: false, reason: 'honeypot' }
  }
  if (args.recentCount >= RATE_LIMIT) return { accept: false, reason: 'rate-limit' }
  return { accept: true }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/leads-spam.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Stage, do not commit**

```bash
git add src/leads/spam.ts tests/leads-spam.test.ts
```

---

### Task 5: Notification email body and the Resend adapter

**Files:**
- Create: `src/leads/email.ts`
- Create: `src/leads/mailer.ts`
- Test: `tests/leads-email.test.ts`

**Interfaces:**
- Consumes: `LeadInput`, `FormType` from `types.ts`.
- Produces: `type LeadEmail = { subject: string; html: string; text: string }`, `buildLeadEmail(args): LeadEmail`, `type SendResult = { ok: true } | { ok: false; error: string }`, `sendLeadEmail(args): Promise<SendResult>`, and `stubbedEmails` (test-only sink).

- [ ] **Step 1: Install Resend**

```bash
pnpm add resend
```

- [ ] **Step 2: Write the failing test**

Create `tests/leads-email.test.ts`:

```ts
// tests/leads-email.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { buildLeadEmail } from '../src/leads/email'
import { sendLeadEmail, stubbedEmails } from '../src/leads/mailer'
import type { LeadInput } from '../src/leads/types'

const lead: LeadInput = {
  cityKey: 'miami',
  formType: 'booking',
  name: 'Dana Whitfield',
  email: 'dana@example.com',
  phone: '305-555-0184',
  payload: {
    'What Type of Service Are Your Looking For?': 'Deep Cleaning ( Most Popular Option)',
    'How Many Bedrooms?': '3',
  },
  isTest: false,
  ipHash: null,
}

describe('buildLeadEmail', () => {
  it('names the city and the person in the subject', () => {
    const mail = buildLeadEmail({ cityName: 'Miami', lead, dashboardUrl: 'https://x/admin/leads/1' })
    expect(mail.subject).toBe('[Miami] New booking request — Dana Whitfield')
  })

  it('uses different wording for a contact submission', () => {
    const mail = buildLeadEmail({
      cityName: 'Houston',
      lead: { ...lead, formType: 'contact', name: 'Marcus Reed' },
      dashboardUrl: 'https://x',
    })
    expect(mail.subject).toBe('[Houston] New contact message — Marcus Reed')
  })

  it('falls back when there is no name', () => {
    const mail = buildLeadEmail({
      cityName: 'Miami',
      lead: { ...lead, name: null },
      dashboardUrl: 'https://x',
    })
    expect(mail.subject).toBe('[Miami] New booking request')
  })

  it('lists every payload field in both bodies', () => {
    const mail = buildLeadEmail({ cityName: 'Miami', lead, dashboardUrl: 'https://x' })
    expect(mail.text).toContain('How Many Bedrooms?')
    expect(mail.text).toContain('3')
    expect(mail.html).toContain('How Many Bedrooms?')
  })

  it('escapes html in submitted values', () => {
    const mail = buildLeadEmail({
      cityName: 'Miami',
      lead: { ...lead, payload: { Message: '<script>alert(1)</script>' } },
      dashboardUrl: 'https://x',
    })
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
  })

  it('includes the dashboard link', () => {
    const mail = buildLeadEmail({
      cityName: 'Miami',
      lead,
      dashboardUrl: 'https://x/admin/leads/abc',
    })
    expect(mail.html).toContain('https://x/admin/leads/abc')
  })
})

describe('sendLeadEmail with STUB_EMAIL', () => {
  beforeEach(() => {
    process.env.STUB_EMAIL = '1'
    stubbedEmails.length = 0
  })

  it('records instead of sending, and reports success', async () => {
    const mail = buildLeadEmail({ cityName: 'Miami', lead, dashboardUrl: 'https://x' })
    const result = await sendLeadEmail({
      to: ['miami@example.com'],
      replyTo: 'dana@example.com',
      email: mail,
    })
    expect(result).toEqual({ ok: true })
    expect(stubbedEmails).toHaveLength(1)
    expect(stubbedEmails[0].to).toEqual(['miami@example.com'])
    expect(stubbedEmails[0].replyTo).toBe('dana@example.com')
  })

  it('fails when there are no recipients', async () => {
    const mail = buildLeadEmail({ cityName: 'Miami', lead, dashboardUrl: 'https://x' })
    const result = await sendLeadEmail({ to: [], replyTo: null, email: mail })
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run tests/leads-email.test.ts`
Expected: FAIL, cannot resolve `../src/leads/email`.

- [ ] **Step 4: Write the body builder**

Create `src/leads/email.ts`:

```ts
// src/leads/email.ts
/*
 * The notification body, as a pure function, so it can be asserted on without
 * a provider or a network.
 *
 * Values come from a public form and are interpolated into HTML, so every one
 * is escaped. Nothing here is customer-facing: this email goes to the operator
 * for the city the lead came from.
 */
import type { LeadInput } from './types'

export type LeadEmail = { subject: string; html: string; text: string }

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildLeadEmail(args: {
  cityName: string
  lead: LeadInput
  dashboardUrl: string
}): LeadEmail {
  const { cityName, lead, dashboardUrl } = args
  const kind = lead.formType === 'booking' ? 'New booking request' : 'New contact message'
  const subject = lead.name ? `[${cityName}] ${kind} — ${lead.name}` : `[${cityName}] ${kind}`

  const entries = Object.entries(lead.payload).filter(([, value]) => value.trim() !== '')

  const text = [
    `${kind} from the ${cityName} website.`,
    '',
    ...entries.map(([label, value]) => `${label}: ${value}`),
    '',
    `Open in dashboard: ${dashboardUrl}`,
  ].join('\n')

  const rows = entries
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6b7680;font-size:13px;vertical-align:top">${escapeHtml(
          label,
        )}</td><td style="padding:4px 0;font-size:13px">${escapeHtml(value)}</td></tr>`,
    )
    .join('')

  const html = [
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1b1f23">',
    `<p style="font-size:14px"><strong>${escapeHtml(kind)}</strong> from the `,
    `<strong>${escapeHtml(cityName)}</strong> website.</p>`,
    `<table cellpadding="0" cellspacing="0">${rows}</table>`,
    `<p style="margin-top:16px"><a href="${escapeHtml(dashboardUrl)}" `,
    'style="background:#1b6f56;color:#fff;border-radius:5px;padding:8px 14px;',
    'text-decoration:none;font-size:13px">Open in dashboard</a></p>',
    '</div>',
  ].join('')

  return { subject, html, text }
}
```

- [ ] **Step 5: Write the mailer adapter**

Create `src/leads/mailer.ts`:

```ts
// src/leads/mailer.ts
/*
 * The only module that talks to Resend.
 *
 * STUB_EMAIL=1 diverts everything into `stubbedEmails` so the test suite can
 * never reach the provider. That flag mirrors the pipeline's STUB_MODEL=1.
 *
 * One verified sending domain serves every city (LEADS_FROM_EMAIL); the
 * per-city part is the recipient list. Reply-To is the customer, so the
 * operator can answer from their mail client without opening the dashboard.
 */
import type { LeadEmail } from './email'

export type SendResult = { ok: true } | { ok: false; error: string }

export type SentEmail = {
  to: string[]
  from: string
  replyTo: string | null
  email: LeadEmail
}

/** Test-only sink. Populated only when STUB_EMAIL=1. */
export const stubbedEmails: SentEmail[] = []

export async function sendLeadEmail(args: {
  to: string[]
  replyTo: string | null
  email: LeadEmail
}): Promise<SendResult> {
  if (args.to.length === 0) return { ok: false, error: 'no recipients configured' }

  const from = process.env.LEADS_FROM_EMAIL ?? 'leads@example.invalid'

  if (process.env.STUB_EMAIL === '1') {
    stubbedEmails.push({ to: args.to, from, replyTo: args.replyTo, email: args.email })
    return { ok: true }
  }

  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY is not set' }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(key)
    const { error } = await resend.emails.send({
      from,
      to: args.to,
      replyTo: args.replyTo ?? undefined,
      subject: args.email.subject,
      html: args.email.html,
      text: args.email.text,
    })
    return error ? { ok: false, error: error.message } : { ok: true }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : String(cause) }
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm vitest run tests/leads-email.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 7: Stage, do not commit**

```bash
git add src/leads/email.ts src/leads/mailer.ts tests/leads-email.test.ts package.json pnpm-lock.yaml
```

---

### Task 6: Submit orchestration

**Files:**
- Create: `src/leads/submit.ts`
- Test: `tests/leads-submit.test.ts`

**Interfaces:**
- Consumes: `parseBookingForm`, `parseContactForm`, `HONEYPOT_FIELD` (Task 2); `attributeCity` (Task 3); `spamVerdict`, `hashIp`, `RATE_WINDOW_MS` (Task 4); `buildLeadEmail`, `SendResult` (Task 5); types (Task 1).
- Produces: `type SubmitPorts`, `type SubmitResult`, `submitLead(args, ports): Promise<SubmitResult>`.

**This task encodes the single most important constraint in the design: the
lead is saved BEFORE the email is attempted, and a failing email never fails
the submission.** The tests below exist mainly to pin that.

`SubmitPorts` is an explicit interface rather than importing the store
directly, so this module has no I/O of its own and the tests need no database.

- [ ] **Step 1: Write the failing test**

Create `tests/leads-submit.test.ts`:

```ts
// tests/leads-submit.test.ts
import { describe, expect, it } from 'vitest'
import { submitLead, type SubmitPorts } from '../src/leads/submit'
import type { DomainsIndex } from '../src/content/resolve-rewrite'
import type { LeadInput, LeadRecord } from '../src/leads/types'

const domains: DomainsIndex = { default: 'minneapolis', hosts: { 'miamicleans.com': 'miami' } }

function bookingForm(over: Record<string, string> = {}): FormData {
  const f = new FormData()
  f.set('form_fields[field_22aa910]', 'Deep Cleaning ( Most Popular Option)')
  f.set('form_fields[message]', 'Slightly Dirty (Nothing crazy)')
  f.set('form_fields[field_c4cfac1]', '3')
  f.set('form_fields[field_caacb3a]', '2')
  f.set('form_fields[field_1abcd81]', 'Sometime this week')
  f.set('form_fields[field_1872bc3]', '1420 Brickell Ave')
  f.set('form_fields[name]', 'Dana Whitfield')
  f.set('form_fields[email]', 'dana@example.com')
  f.set('form_fields[field_ca2243e]', '305-555-0184')
  f.set('form_fields[field_deeaf01]', 'Call Me')
  for (const [k, v] of Object.entries(over)) f.set(k, v)
  return f
}

type Call = string

function ports(over: Partial<SubmitPorts> = {}): { ports: SubmitPorts; calls: Call[] } {
  const calls: Call[] = []
  const base: SubmitPorts = {
    async countRecentByIpHash() {
      calls.push('count')
      return 0
    },
    async createLead(input: LeadInput) {
      calls.push('create')
      return { ...input, id: 'lead-1', status: 'new', notes: '', emailStatus: 'pending', emailError: null, submittedAt: new Date(), updatedAt: new Date() } satisfies LeadRecord
    },
    async markLeadEmail(_id, status) {
      calls.push(`mark:${status}`)
    },
    async getSiteSettings() {
      calls.push('settings')
      return { cityKey: 'miami', notifyEmails: ['miami@example.com'] }
    },
    async sendEmail() {
      calls.push('send')
      return { ok: true }
    },
    cityNameFor: async () => 'Miami',
    dashboardUrlFor: (id) => `https://x/admin/leads/${id}`,
  }
  return { ports: { ...base, ...over }, calls }
}

const args = (form: FormData, over = {}) => ({
  form,
  formType: 'booking' as const,
  host: 'miamicleans.com',
  renderedCityKey: 'miami',
  clientIp: '203.0.113.7',
  ipSalt: 'pepper',
  domains,
  ...over,
})

describe('submitLead', () => {
  it('saves the lead and reports success', async () => {
    const { ports: p } = ports()
    const result = await submitLead(args(bookingForm()), p)
    expect(result).toEqual({ ok: true, leadId: 'lead-1' })
  })

  it('creates the lead BEFORE attempting the email', async () => {
    const { ports: p, calls } = ports()
    await submitLead(args(bookingForm()), p)
    expect(calls.indexOf('create')).toBeLessThan(calls.indexOf('send'))
  })

  it('still succeeds, and flags the row, when the email fails', async () => {
    const { ports: p, calls } = ports({
      async sendEmail() {
        return { ok: false, error: 'domain not verified' }
      },
    })
    const result = await submitLead(args(bookingForm()), p)
    expect(result).toEqual({ ok: true, leadId: 'lead-1' })
    expect(calls).toContain('mark:failed')
  })

  it('still succeeds, and flags the row, when the mailer throws', async () => {
    const { ports: p, calls } = ports({
      async sendEmail() {
        throw new Error('socket hang up')
      },
    })
    const result = await submitLead(args(bookingForm()), p)
    expect(result.ok).toBe(true)
    expect(calls).toContain('mark:failed')
  })

  it('marks skipped and sends nothing when the city has no inbox', async () => {
    const { ports: p, calls } = ports({ async getSiteSettings() { return null } })
    await submitLead(args(bookingForm()), p)
    expect(calls).toContain('mark:skipped')
    expect(calls).not.toContain('send')
  })

  it('marks sent on success', async () => {
    const { ports: p, calls } = ports()
    await submitLead(args(bookingForm()), p)
    expect(calls).toContain('mark:sent')
  })

  it('attributes a preview submission as a test row and sends no email', async () => {
    const { ports: p, calls } = ports()
    let captured: LeadInput | null = null
    p.createLead = async (input) => {
      captured = input
      return { ...input, id: 'lead-2', status: 'new', notes: '', emailStatus: 'pending', emailError: null, submittedAt: new Date(), updatedAt: new Date() }
    }
    await submitLead(args(bookingForm(), { host: 'localhost', renderedCityKey: 'testville' }), p)
    expect(captured!.isTest).toBe(true)
    expect(captured!.cityKey).toBe('testville')
    expect(calls).not.toContain('send')
  })

  it('returns field errors and writes nothing when validation fails', async () => {
    const { ports: p, calls } = ports()
    const result = await submitLead(args(bookingForm({ 'form_fields[email]': 'bad' })), p)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('validation')
    expect(calls).not.toContain('create')
  })

  it('returns success but writes nothing when the honeypot is filled', async () => {
    const { ports: p, calls } = ports()
    const form = bookingForm()
    form.set('form_fields[website_url]', 'http://spam.example')
    const result = await submitLead(args(form), p)
    expect(result.ok).toBe(true)
    expect(calls).not.toContain('create')
  })

  it('rejects when rate limited', async () => {
    const { ports: p, calls } = ports({ async countRecentByIpHash() { return 99 } })
    const result = await submitLead(args(bookingForm()), p)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('rate-limit')
    expect(calls).not.toContain('create')
  })

  it('reports a storage error when the insert throws', async () => {
    const { ports: p } = ports({
      async createLead() {
        throw new Error('connection refused')
      },
    })
    const result = await submitLead(args(bookingForm()), p)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('storage')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/leads-submit.test.ts`
Expected: FAIL, cannot resolve `../src/leads/submit`.

- [ ] **Step 3: Write the implementation**

Create `src/leads/submit.ts`:

```ts
// src/leads/submit.ts
/*
 * The order of operations for a public form submission, with every side effect
 * behind an injected port so this module has no I/O and its tests need no
 * database and no network.
 *
 * THE ORDERING CONSTRAINT: the lead is created BEFORE the email is attempted,
 * and no email outcome can turn a saved lead into a failed submission. If
 * Resend is down, the domain is unverified, or the inbox is misconfigured, the
 * customer is already captured and the row carries a visible flag. A broken
 * notification path must never lose a customer.
 */
import type { DomainsIndex } from '../content/resolve-rewrite'
import { attributeCity } from './attribution'
import { buildLeadEmail, type LeadEmail } from './email'
import type { SendResult } from './mailer'
import { HONEYPOT_FIELD, parseBookingForm, parseContactForm } from './schema'
import { RATE_WINDOW_MS, hashIp, spamVerdict } from './spam'
import type { EmailStatus, FormType, LeadInput, LeadRecord, SiteSettingsRecord } from './types'

export type SubmitPorts = {
  countRecentByIpHash(ipHash: string, windowMs: number): Promise<number>
  createLead(input: LeadInput): Promise<LeadRecord>
  markLeadEmail(id: string, status: EmailStatus, error: string | null): Promise<void>
  getSiteSettings(cityKey: string): Promise<SiteSettingsRecord | null>
  sendEmail(args: {
    to: string[]
    replyTo: string | null
    email: LeadEmail
  }): Promise<SendResult>
  /** Display name for the city, for the subject line. */
  cityNameFor(cityKey: string): Promise<string>
  dashboardUrlFor(leadId: string): string
}

export type SubmitArgs = {
  form: FormData
  formType: FormType
  host: string
  renderedCityKey: string
  clientIp: string | null
  ipSalt: string
  domains: DomainsIndex
}

export type SubmitResult =
  | { ok: true; leadId?: string }
  | { ok: false; error: 'validation'; fieldErrors: Record<string, string> }
  | { ok: false; error: 'rate-limit' | 'storage' }

export async function submitLead(args: SubmitArgs, ports: SubmitPorts): Promise<SubmitResult> {
  const parsed =
    args.formType === 'booking' ? parseBookingForm(args.form) : parseContactForm(args.form)

  const ipHash = hashIp(args.clientIp, args.ipSalt)
  const honeypotRaw = args.form.get(HONEYPOT_FIELD)
  const honeypotValue = typeof honeypotRaw === 'string' ? honeypotRaw : null

  const recentCount = ipHash ? await ports.countRecentByIpHash(ipHash, RATE_WINDOW_MS) : 0
  const verdict = spamVerdict({ honeypotValue, recentCount })

  // A bot is told it succeeded. It learns nothing, and retries cost it time.
  if (!verdict.accept && verdict.reason === 'honeypot') return { ok: true }
  if (!verdict.accept) return { ok: false, error: 'rate-limit' }

  if (!parsed.ok) return { ok: false, error: 'validation', fieldErrors: parsed.fieldErrors }

  const attribution = attributeCity(args.host, args.renderedCityKey, args.domains)

  const input: LeadInput = {
    cityKey: attribution.cityKey,
    formType: args.formType,
    name: parsed.fields.name,
    email: parsed.fields.email,
    phone: parsed.fields.phone,
    payload: parsed.fields.payload,
    isTest: attribution.isTest,
    ipHash,
  }

  let lead: LeadRecord
  try {
    lead = await ports.createLead(input)
  } catch {
    return { ok: false, error: 'storage' }
  }

  // From here on nothing may change the caller's result. The lead is durable.
  await notify(lead, input, attribution.isTest, ports)
  return { ok: true, leadId: lead.id }
}

async function notify(
  lead: LeadRecord,
  input: LeadInput,
  isTest: boolean,
  ports: SubmitPorts,
): Promise<void> {
  try {
    if (isTest) {
      await ports.markLeadEmail(lead.id, 'skipped', 'preview submission')
      return
    }

    const settings = await ports.getSiteSettings(lead.cityKey)
    const to = settings?.notifyEmails ?? []
    if (to.length === 0) {
      await ports.markLeadEmail(lead.id, 'skipped', 'no notification inbox configured')
      return
    }

    const email = buildLeadEmail({
      cityName: await ports.cityNameFor(lead.cityKey),
      lead: input,
      dashboardUrl: ports.dashboardUrlFor(lead.id),
    })

    const result = await ports.sendEmail({ to, replyTo: input.email, email })
    await ports.markLeadEmail(
      lead.id,
      result.ok ? 'sent' : 'failed',
      result.ok ? null : result.error,
    )
  } catch (cause) {
    // Even the bookkeeping failing must not surface to the customer.
    try {
      await ports.markLeadEmail(
        lead.id,
        'failed',
        cause instanceof Error ? cause.message : String(cause),
      )
    } catch {
      /* the lead is saved; nothing further can be done here */
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/leads-submit.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Stage, do not commit**

```bash
git add src/leads/submit.ts tests/leads-submit.test.ts
```

---

### Task 7: Server action and the booking form

**Files:**
- Create: `src/app/(sites)/[city]/lead-actions.ts`
- Modify: `src/components/book/ComingSoonPanel.tsx`
- Modify: `src/components/book/BookingForm.tsx`
- Modify: `src/components/book/BookNowSection.tsx:45`, `src/components/book/BookSection.tsx:136`
- Modify: `src/data/book.ts`

**Interfaces:**
- Consumes: `submitLead`, `SubmitPorts`, `SubmitResult` (Task 6); store functions (Task 1); `sendLeadEmail` (Task 5).
- Produces: `submitLeadAction(formType: FormType, renderedCityKey: string, form: FormData): Promise<SubmitResult>` and the `SubmitResultPanel` component.

- [ ] **Step 1: Write the server action**

Create `src/app/(sites)/[city]/lead-actions.ts`:

```ts
'use server'
/*
 * The only framework surface on the capture path. Everything it does beyond
 * reading request state is delegated to src/leads/submit.ts, which is where
 * the tests live: a 'use server' module is an RPC endpoint, not something
 * vitest can import and call.
 *
 * The city is read from the Host header HERE, not passed in from the browser.
 * Per the Next 16 server-actions guide, an action is reachable by anyone who
 * can POST to it, and bound arguments round-trip through the client, so
 * `renderedCityKey` is untrusted. attributeCity() consults it only for draft
 * previews. See src/leads/attribution.ts.
 */
import { headers } from 'next/headers'
import domainsJson from '../../../../content/_domains.json'
import type { DomainsIndex } from '@/content/resolve-rewrite'
import { getCity } from '@/content/store'
import { sendLeadEmail } from '@/leads/mailer'
import {
  countRecentByIpHash,
  createLead,
  getSiteSettings,
  markLeadEmail,
} from '@/leads/store'
import { submitLead, type SubmitPorts, type SubmitResult } from '@/leads/submit'
import type { FormType } from '@/leads/types'
import { ADMIN_BASE } from '@/app/admin-x7kq92mpfw4rt8vz/base'

function clientIp(list: Headers): string | null {
  const forwarded = list.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return list.get('x-real-ip')
}

export async function submitLeadAction(
  formType: FormType,
  renderedCityKey: string,
  form: FormData,
): Promise<SubmitResult> {
  const list = await headers()
  const host = list.get('host') ?? ''
  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? `https://${host}`

  const ports: SubmitPorts = {
    countRecentByIpHash,
    createLead,
    markLeadEmail,
    getSiteSettings,
    sendEmail: sendLeadEmail,
    async cityNameFor(cityKey) {
      try {
        return (await getCity(cityKey)).city
      } catch {
        return cityKey
      }
    },
    dashboardUrlFor: (id) => `${origin}${ADMIN_BASE}/leads/${id}`,
  }

  return submitLead(
    {
      form,
      formType,
      host,
      renderedCityKey,
      clientIp: clientIp(list),
      ipSalt: process.env.IP_HASH_SALT ?? 'unsalted-dev-only',
      domains: domainsJson as DomainsIndex,
    },
    ports,
  )
}
```

- [ ] **Step 2: Add the success copy to the data file**

In `src/data/book.ts`, inside the `comingSoon` object, add two keys (keep the existing ones, they are now the failure fallback):

```ts
      successHeading: "Thanks, we&rsquo;ve got your request.",
      successBody: "Someone from our team will be in touch shortly.",
```

Update the `BookData` type's `comingSoon` shape to include
`successHeading: string` and `successBody: string`.

- [ ] **Step 3: Turn ComingSoonPanel into a result panel**

Replace the body of `src/components/book/ComingSoonPanel.tsx`:

```tsx
import type { BookData } from "@/data/book";

/*
 * Shown by BookingForm in place of the field list after submit.
 *
 * Two states. `success` is the normal path. `error` reuses the original
 * call/email fallback copy, and is shown ONLY when the lead did not survive:
 * a storage failure or a rate-limit rejection. A failed notification email is
 * NOT an error here, because the lead is saved either way.
 */
export default function SubmitResultPanel({
  comingSoon,
  state,
}: {
  comingSoon: BookData["comingSoon"];
  state: "success" | "error";
}) {
  if (state === "success") {
    return (
      <div className="text-center">
        <h3 className="text-herogreen mb-[1.5rem] text-[2.4rem] leading-[1.2em] font-semibold">
          {comingSoon.successHeading}
        </h3>
        <p className="text-[1.6rem] leading-[1.5em]">{comingSoon.successBody}</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h3 className="text-herogreen mb-[1.5rem] text-[2.4rem] leading-[1.2em] font-semibold">
        {comingSoon.heading}
      </h3>
      <p className="text-[1.6rem] leading-[1.5em]">
        In the meantime, call us at{" "}
        <a href={comingSoon.phoneHref} className="text-rust hover:underline">
          {comingSoon.phone}
        </a>{" "}
        or email{" "}
        <a href={comingSoon.emailHref} className="text-rust hover:underline">
          {comingSoon.email}
        </a>
        .
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Wire the booking form**

In `src/components/book/BookingForm.tsx`:

Add `cityKey: string` to the props type and destructure it. Replace the
`submitted` state and the `onSubmit` handler:

```tsx
  const [result, setResult] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
```

Replace the `if (submitted)` early return at line 148:

```tsx
  if (result === "success" || result === "error") {
    return <SubmitResultPanel comingSoon={comingSoon} state={result} />;
  }
```

Replace the `onSubmit` at line 153:

```tsx
      onSubmit={async (e) => {
        e.preventDefault();
        if (result === "pending") return;
        setResult("pending");
        setFieldErrors({});
        const data = new FormData(e.currentTarget);
        const outcome = await submitLeadAction("booking", cityKey, data);
        if (outcome.ok) {
          setResult("success");
          return;
        }
        if (outcome.error === "validation") {
          setFieldErrors(outcome.fieldErrors);
          setResult("idle");
          return;
        }
        setResult("error");
      }}
```

Add the honeypot immediately before the submit button's wrapper div. It must
be invisible to humans and skipped by assistive tech, without `display:none`,
which some bots detect:

```tsx
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website_url">Leave this field empty</label>
        <input
          id="website_url"
          name="form_fields[website_url]"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
```

Disable the submit button while pending by adding to its className:
`` `${result === "pending" ? "opacity-70" : ""}` `` and `disabled={result === "pending"}`.

Render a field error under any field that has one, inside the field group map:

```tsx
          {fieldErrors[field.name] && (
            <p className="mt-[0.5rem] text-[1.4rem] text-rust">{fieldErrors[field.name]}</p>
          )}
```

Add the imports:

```tsx
import SubmitResultPanel from "@/components/book/ComingSoonPanel";
import { submitLeadAction } from "@/app/(sites)/[city]/lead-actions";
```

- [ ] **Step 5: Thread cityKey through both sections**

`BookNowSection.tsx` and `BookSection.tsx` already receive city-derived data.
Add a `cityKey: string` prop to each, pass it to `<BookingForm cityKey={cityKey} />`,
and pass it in from the two pages that render them
(`src/app/(sites)/[city]/(front)/book-now/page.tsx` and
`src/app/(sites)/[city]/(inner)/book/page.tsx`) using the same
`cityFromParams(params)` result those pages already await, via
`citySlug(city.city)` from `@/content/interpolate`.

- [ ] **Step 6: Verify the build and the existing suite**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint && pnpm build`
Expected: all pass. The pre-existing suite must not regress.

- [ ] **Step 7: Verify the public HTML did not change**

Run the repo's crawler comparison as used in previous rounds.
Expected: `EQUIVALENT` on all public routes except the two form pages, whose
only diff is the added hidden honeypot div. Inspect that diff by eye and
confirm nothing else moved.

- [ ] **Step 8: Stage, do not commit**

```bash
git add "src/app/(sites)/[city]/lead-actions.ts" src/components/book src/data/book.ts "src/app/(sites)/[city]/(front)/book-now/page.tsx" "src/app/(sites)/[city]/(inner)/book/page.tsx"
```

---

### Task 8: The contact form

**Files:**
- Modify: `src/components/contact/ContactFormDisplay.tsx`
- Modify: `src/app/(sites)/[city]/(inner)/contact/page.tsx:69`
- Modify: `src/data/contact.ts`

**Interfaces:**
- Consumes: `submitLeadAction` (Task 7).
- Produces: nothing new.

This component is currently a server component with no interactivity at all
(`ContactFormDisplay.tsx:78` renders a bare `<form>`). It becomes a client
component. Every class name, field name and DOM structure stays byte-identical
so the fidelity clone is unaffected.

- [ ] **Step 1: Add the result copy**

In `src/data/contact.ts`, add to the exported contact data:

```ts
    contactResult: {
      successHeading: "Thanks, we&rsquo;ve got your message.",
      successBody: "We try to answer all enquiries within 24 hours on business days.",
      errorHeading: "Something went wrong.",
      errorBody: "Please call us instead and we&rsquo;ll get straight to it.",
    },
```

Add the matching shape to the `ContactData` type.

- [ ] **Step 2: Convert the component**

At the top of `src/components/contact/ContactFormDisplay.tsx` add `"use client";`
and the imports:

```tsx
"use client";
import { useState } from "react";
import { submitLeadAction } from "@/app/(sites)/[city]/lead-actions";
```

Add `cityKey: string` and `contactResult: ContactData["contactResult"]` to the
props. Add the state and the early return before the existing `return`:

```tsx
  const [result, setResult] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (result === "success" || result === "error") {
    const copy =
      result === "success"
        ? { heading: contactResult.successHeading, body: contactResult.successBody }
        : { heading: contactResult.errorHeading, body: contactResult.errorBody };
    return (
      <div className="py-[2rem]">
        <h3 className="text-herogreen mb-[1rem] text-[2rem] leading-[1.2em] font-semibold">
          {copy.heading}
        </h3>
        <p className="text-[1.6rem] leading-[1.5em]">{copy.body}</p>
      </div>
    );
  }
```

Add the same `onSubmit` handler as Task 7 step 4, with `"contact"` as the form
type. Add the identical hidden honeypot div before the submit button's wrapper.
Add the same per-field error paragraph inside the field map, keyed on the same
`name` expression the inputs already use:
`` fieldErrors[`form_fields[${field.id.replace("form-field-", "")}]`] ``.

- [ ] **Step 3: Pass the new props from the page**

In `src/app/(sites)/[city]/(inner)/contact/page.tsx:69`, destructure
`contactResult` from `contactData(c)` and pass both new props:

```tsx
              <ContactFormDisplay
                cityKey={citySlug(c.city)}
                contactFields={contactFields}
                contactSubmitLabel={contactSubmitLabel}
                contactResult={contactResult}
              />
```

Import `citySlug` from `@/content/interpolate`.

- [ ] **Step 4: Verify**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 5: Manual end-to-end check**

Start the dev server, open `/minneapolis/contact`, submit the form, and confirm:
the success panel appears; a row exists in Prisma Studio (`pnpm prisma studio`)
with `cityKey` `minneapolis`; and with `STUB_EMAIL=1` unset locally the row's
`emailStatus` is `skipped` because no `SiteSettings` row exists yet.

- [ ] **Step 6: Stage, do not commit**

```bash
git add src/components/contact "src/app/(sites)/[city]/(inner)/contact/page.tsx" src/data/contact.ts
```

---

### Task 9: Filter parsing

**Files:**
- Create: `src/leads/filters.ts`
- Test: `tests/leads-filters.test.ts`

**Interfaces:**
- Consumes: `LeadQuery`, `LeadStatus`, `FormType`, `LEAD_STATUSES` from `types.ts`.
- Produces: `parseLeadQuery(params: Record<string, string | string[] | undefined>): LeadQuery` and `leadQueryToSearch(query: LeadQuery): string`.

Filters live in the URL, which is why no client state library is needed and why
any view is bookmarkable. Invalid values fall back to the unfiltered default
rather than erroring, because a hand-edited URL must not 500 the dashboard.

- [ ] **Step 1: Write the failing test**

Create `tests/leads-filters.test.ts`:

```ts
// tests/leads-filters.test.ts
import { describe, expect, it } from 'vitest'
import { leadQueryToSearch, parseLeadQuery } from '../src/leads/filters'

describe('parseLeadQuery', () => {
  it('defaults to everything except test rows', () => {
    expect(parseLeadQuery({})).toEqual({
      city: null,
      status: null,
      formType: null,
      includeTest: false,
    })
  })

  it('reads all four params', () => {
    expect(
      parseLeadQuery({ city: 'miami', status: 'contacted', form: 'booking', test: '1' }),
    ).toEqual({ city: 'miami', status: 'contacted', formType: 'booking', includeTest: true })
  })

  it('drops an unknown status instead of erroring', () => {
    expect(parseLeadQuery({ status: 'banana' }).status).toBeNull()
  })

  it('drops an unknown form type', () => {
    expect(parseLeadQuery({ form: 'carrier-pigeon' }).formType).toBeNull()
  })

  it('rejects a city key that is not a safe slug', () => {
    expect(parseLeadQuery({ city: '../../etc' }).city).toBeNull()
  })

  it('takes the first value when a param repeats', () => {
    expect(parseLeadQuery({ city: ['miami', 'houston'] }).city).toBe('miami')
  })
})

describe('leadQueryToSearch', () => {
  it('omits empty filters', () => {
    expect(
      leadQueryToSearch({ city: null, status: null, formType: null, includeTest: false }),
    ).toBe('')
  })

  it('round-trips through parseLeadQuery', () => {
    const query = { city: 'miami', status: 'quoted' as const, formType: 'contact' as const, includeTest: true }
    const search = leadQueryToSearch(query)
    expect(parseLeadQuery(Object.fromEntries(new URLSearchParams(search)))).toEqual(query)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/leads-filters.test.ts`
Expected: FAIL, cannot resolve `../src/leads/filters`.

- [ ] **Step 3: Write the implementation**

Create `src/leads/filters.ts`:

```ts
// src/leads/filters.ts
/*
 * searchParams in, a validated LeadQuery out.
 *
 * Every filter lives in the URL, which is what makes "Miami, contacted"
 * bookmarkable and pasteable, and is why this feature needs no client state
 * library. A hand-edited URL must never crash the dashboard, so anything
 * unrecognised degrades to "no filter" rather than throwing.
 */
import { LEAD_STATUSES, type FormType, type LeadQuery, type LeadStatus } from './types'

const CITY_KEY = /^[a-z0-9-]+$/
const FORM_TYPES: readonly FormType[] = ['booking', 'contact']

type Params = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export function parseLeadQuery(params: Params): LeadQuery {
  const rawCity = first(params.city)
  const rawStatus = first(params.status)
  const rawForm = first(params.form)

  return {
    city: rawCity && CITY_KEY.test(rawCity) ? rawCity : null,
    status: LEAD_STATUSES.includes(rawStatus as LeadStatus) ? (rawStatus as LeadStatus) : null,
    formType: FORM_TYPES.includes(rawForm as FormType) ? (rawForm as FormType) : null,
    includeTest: first(params.test) === '1',
  }
}

export function leadQueryToSearch(query: LeadQuery): string {
  const search = new URLSearchParams()
  if (query.city) search.set('city', query.city)
  if (query.status) search.set('status', query.status)
  if (query.formType) search.set('form', query.formType)
  if (query.includeTest) search.set('test', '1')
  return search.toString()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/leads-filters.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Stage, do not commit**

```bash
git add src/leads/filters.ts tests/leads-filters.test.ts
```

---

### Task 10: Admin chrome and the Leads list

**Files:**
- Modify: `src/app/admin-x7kq92mpfw4rt8vz/layout.tsx`
- Modify: `src/app/admin-x7kq92mpfw4rt8vz/ui.tsx`
- Create: `src/app/admin-x7kq92mpfw4rt8vz/leads/page.tsx`

**Interfaces:**
- Consumes: `listLeads` (Task 1), `parseLeadQuery` / `leadQueryToSearch` (Task 9), `listCities` from `@/pipeline/admin-logic`.
- Produces: `LeadStatusChip` in `ui.tsx`.

- [ ] **Step 1: Add the status chip**

Append to `src/app/admin-x7kq92mpfw4rt8vz/ui.tsx`:

```tsx
const LEAD_CHIP: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: 'NEW', className: 'bg-[#e8f0fe] text-[#1a4fb4] border-[#b4c9f2]' },
  contacted: { label: 'CONTACTED', className: 'bg-[#fff4e5] text-[#8a5300] border-[#f0cf9a]' },
  quoted: { label: 'QUOTED', className: 'bg-[#f3ecfb] text-[#5b2d90] border-[#d6c2ee]' },
  booked: { label: 'BOOKED', className: 'bg-[#e6f4ea] text-[#106b35] border-[#a8d8ba]' },
  lost: { label: 'LOST', className: 'bg-[#f2f4f6] text-[#6b7680] border-[#d8dde2]' },
}

export function LeadStatusChip({ status }: { status: LeadStatus }) {
  const chip = LEAD_CHIP[status]
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide ${chip.className}`}
    >
      {chip.label}
    </span>
  )
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded border border-[#dde2e7] bg-[#eef1f4] px-1.5 text-[0.65rem] font-semibold text-[#4a545d]">
      {children}
    </span>
  )
}
```

Import `LeadStatus` from `@/leads/types` at the top of the file.

- [ ] **Step 2: Add the tabs to the layout**

In `src/app/admin-x7kq92mpfw4rt8vz/layout.tsx`, between the `<header>` and
`<main>`, add a nav strip. Keep copy free of em dashes:

```tsx
      <nav className="border-b border-[#d8dde2] bg-white">
        <div className="mx-auto flex max-w-[64rem] gap-6 px-6">
          <Link
            href={ADMIN_BASE}
            className="border-b-2 border-transparent py-3 text-[0.9rem] text-[#6b7680] hover:text-[#1b1f23]"
          >
            Sites
          </Link>
          <Link
            href={`${ADMIN_BASE}/leads`}
            className="border-b-2 border-transparent py-3 text-[0.9rem] text-[#6b7680] hover:text-[#1b1f23]"
          >
            Leads
          </Link>
        </div>
      </nav>
```

Active-tab highlighting needs `usePathname`, which would make the layout a
client component. Deliberately skipped: this is an internal tool with two tabs.

- [ ] **Step 3: Write the leads list**

Create `src/app/admin-x7kq92mpfw4rt8vz/leads/page.tsx`:

```tsx
import Link from 'next/link'
import { listCities } from '@/pipeline/admin-logic'
import { parseLeadQuery } from '@/leads/filters'
import { listLeads } from '@/leads/store'
import { LEAD_STATUSES } from '@/leads/types'
import { ADMIN_BASE } from '../base'
import { LeadStatusChip, Pill } from '../ui'

/*
 * force-dynamic for the same reason the Sites screen uses it: the list changes
 * whenever a customer submits or the operator moves a lead, and a cached
 * dashboard would show stale counts.
 */
export const dynamic = 'force-dynamic'

function relative(from: Date): string {
  const mins = Math.round((Date.now() - from.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.round(hours / 24)} d ago`
}

/** Builds an href that keeps every current filter except the one being set. */
function filterHref(current: URLSearchParams, key: string, value: string | null): string {
  const next = new URLSearchParams(current)
  if (value === null) next.delete(key)
  else next.set(key, value)
  const search = next.toString()
  return `${ADMIN_BASE}/leads${search ? `?${search}` : ''}`
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = parseLeadQuery(params)
  const [leads, cities] = await Promise.all([listLeads(query), listCities()])
  const current = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) =>
      typeof v === 'string' ? [[k, v] as [string, string]] : [],
    ),
  )

  const unworked = leads.filter((l) => l.status !== 'booked' && l.status !== 'lost').length

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[1.4rem] font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-[0.85rem] text-[#6b7680]">
          {leads.length} shown, {unworked} still need action.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[0.8rem]">
        <FilterGroup
          label="City"
          current={query.city}
          options={cities.map((c) => ({ value: c.key, label: c.city }))}
          href={(v) => filterHref(current, 'city', v)}
        />
        <FilterGroup
          label="Status"
          current={query.status}
          options={LEAD_STATUSES.map((s) => ({ value: s, label: s }))}
          href={(v) => filterHref(current, 'status', v)}
        />
        <FilterGroup
          label="Form"
          current={query.formType}
          options={[
            { value: 'booking', label: 'booking' },
            { value: 'contact', label: 'contact' },
          ]}
          href={(v) => filterHref(current, 'form', v)}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-[#d8dde2] bg-white">
        {leads.length === 0 && (
          <p className="px-4 py-8 text-center text-[0.9rem] text-[#6b7680]">
            No leads match these filters.
          </p>
        )}
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`${ADMIN_BASE}/leads/${lead.id}`}
            className="flex items-center gap-3 border-b border-[#e6eaee] px-4 py-3 last:border-b-0 hover:bg-[#f7f8f9]"
          >
            <LeadStatusChip status={lead.status} />
            <span className="min-w-[9rem] text-[0.9rem] font-medium">
              {lead.name ?? 'No name given'}
            </span>
            <span className="flex-1 truncate text-[0.8rem] text-[#6b7680]">
              <Pill>{lead.cityKey.toUpperCase()}</Pill> <Pill>{lead.formType.toUpperCase()}</Pill>{' '}
              {lead.phone ?? lead.email ?? ''}
              {lead.emailStatus === 'failed' && (
                <span className="ml-2 text-[#a11212]">email not sent</span>
              )}
            </span>
            <span className="text-[0.75rem] whitespace-nowrap text-[#8a949d]">
              {relative(lead.submittedAt)}
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}

function FilterGroup({
  label,
  current,
  options,
  href,
}: {
  label: string
  current: string | null
  options: { value: string; label: string }[]
  href: (value: string | null) => string
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-[#d8dde2] bg-white px-2 py-1">
      <span className="text-[0.7rem] font-semibold text-[#6b7680] uppercase">{label}</span>
      <Link href={href(null)} className={current === null ? 'font-semibold' : 'text-[#6b7680]'}>
        All
      </Link>
      {options.map((option) => (
        <Link
          key={option.value}
          href={href(option.value)}
          className={current === option.value ? 'font-semibold' : 'text-[#6b7680]'}
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 5: Check it by eye**

Start the dev server, visit `{ADMIN_BASE}/leads`, submit a test lead from a
city page, and confirm it appears with the right city pill. Click each filter
and confirm the URL changes and the list narrows.

- [ ] **Step 6: Stage, do not commit**

```bash
git add src/app/admin-x7kq92mpfw4rt8vz/layout.tsx src/app/admin-x7kq92mpfw4rt8vz/ui.tsx src/app/admin-x7kq92mpfw4rt8vz/leads
```

---

### Task 11: Lead detail, status and notes

**Files:**
- Create: `src/app/admin-x7kq92mpfw4rt8vz/leads/[id]/page.tsx`
- Create: `src/app/admin-x7kq92mpfw4rt8vz/leads/lead-actions.ts`

**Interfaces:**
- Consumes: `getLead`, `setLeadStatus`, `setLeadNotes` (Task 1); `LeadStatusChip` (Task 10).
- Produces: `setStatusAction(id: string, status: LeadStatus): Promise<void>`, `saveNotesAction(id: string, formData: FormData): Promise<void>`.

- [ ] **Step 1: Write the admin actions**

Create `src/app/admin-x7kq92mpfw4rt8vz/leads/lead-actions.ts`:

```ts
'use server'
/*
 * Mutations for the lead detail screen.
 *
 * Both revalidate the detail page AND the list, because a status change alters
 * the list's filtering and its "still need action" count. Per the Next 16
 * server-actions guide, revalidatePath re-renders inside the same response, so
 * the screen updates without a follow-up fetch.
 *
 * NOTE: there is no auth on this admin by explicit decision (see the spec's
 * security posture). These actions are as reachable as the pages. Inputs are
 * validated here so a malformed POST cannot write junk; when auth is added,
 * the check belongs at the top of both functions.
 */
import { revalidatePath } from 'next/cache'
import { setLeadNotes, setLeadStatus } from '@/leads/store'
import { LEAD_STATUSES, type LeadStatus } from '@/leads/types'
import { ADMIN_BASE } from '../base'

export async function setStatusAction(id: string, status: LeadStatus): Promise<void> {
  if (!LEAD_STATUSES.includes(status)) throw new Error(`unknown status "${status}"`)
  await setLeadStatus(id, status)
  revalidatePath(`${ADMIN_BASE}/leads/${id}`)
  revalidatePath(`${ADMIN_BASE}/leads`)
}

export async function saveNotesAction(id: string, formData: FormData): Promise<void> {
  const raw = formData.get('notes')
  const notes = typeof raw === 'string' ? raw.slice(0, 5000) : ''
  await setLeadNotes(id, notes)
  revalidatePath(`${ADMIN_BASE}/leads/${id}`)
}
```

- [ ] **Step 2: Write the detail page**

Create `src/app/admin-x7kq92mpfw4rt8vz/leads/[id]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLead } from '@/leads/store'
import { LEAD_STATUSES } from '@/leads/types'
import { ADMIN_BASE } from '../../base'
import { BTN_PRIMARY, INPUT, LeadStatusChip, Panel, Pill } from '../../ui'
import { saveNotesAction, setStatusAction } from '../lead-actions'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lead = await getLead(id)
  if (!lead) notFound()

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[1.4rem] font-semibold tracking-tight">
            {lead.name ?? 'No name given'}
          </h1>
          <p className="mt-1 text-[0.85rem] text-[#6b7680]">
            <Pill>{lead.cityKey.toUpperCase()}</Pill> <Pill>{lead.formType.toUpperCase()}</Pill>{' '}
            {lead.submittedAt.toLocaleString()}
            {lead.isTest && <span className="ml-2 text-[#8a5300]">preview submission</span>}
          </p>
        </div>
        <LeadStatusChip status={lead.status} />
      </div>

      <Panel title="Submitted">
        <dl className="text-[0.9rem]">
          {Object.entries(lead.payload)
            .filter(([, value]) => value.trim() !== '')
            .map(([label, value]) => (
              <div key={label} className="flex gap-3 border-b border-[#e6eaee] py-1.5 last:border-b-0">
                <dt className="min-w-[16rem] text-[0.8rem] text-[#6b7680]">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      </Panel>

      <Panel title="Status">
        <div className="flex flex-wrap gap-2">
          {LEAD_STATUSES.map((status) => (
            <form key={status} action={setStatusAction.bind(null, lead.id, status)}>
              <button
                type="submit"
                disabled={status === lead.status}
                className={`rounded-full border px-3 py-1 text-[0.8rem] ${
                  status === lead.status
                    ? 'border-[#f0cf9a] bg-[#fff4e5] font-semibold text-[#8a5300]'
                    : 'border-[#c3cbd3] bg-white text-[#4a545d] hover:bg-[#eef1f4]'
                }`}
              >
                {status}
              </button>
            </form>
          ))}
        </div>
      </Panel>

      <Panel title="Notes">
        <form action={saveNotesAction.bind(null, lead.id)}>
          <textarea
            name="notes"
            rows={4}
            defaultValue={lead.notes}
            placeholder="What happened on the call"
            className={INPUT}
          />
          <button type="submit" className={`${BTN_PRIMARY} mt-3`}>
            Save notes
          </button>
        </form>
      </Panel>

      <Panel title="Notification">
        <p className="text-[0.9rem]">
          Email status: <strong>{lead.emailStatus}</strong>
          {lead.emailError && <span className="ml-2 text-[#a11212]">{lead.emailError}</span>}
        </p>
      </Panel>

      <Link href={`${ADMIN_BASE}/leads`} className="text-[0.85rem] text-[#6b7680]">
        Back to all leads
      </Link>
    </>
  )
}
```

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 4: Check it by eye**

Open a lead, click through all five statuses, confirm the chip updates and the
list reflects the change. Save a note, reload, confirm it persisted.

- [ ] **Step 5: Stage, do not commit**

```bash
git add src/app/admin-x7kq92mpfw4rt8vz/leads
```

---

### Task 12: Site readiness and the Sites screen

**Files:**
- Create: `src/leads/readiness.ts`
- Create: `src/app/admin-x7kq92mpfw4rt8vz/sites/[key]/page.tsx`
- Create: `src/app/admin-x7kq92mpfw4rt8vz/sites/site-actions.ts`
- Modify: `src/app/admin-x7kq92mpfw4rt8vz/page.tsx`
- Modify: `src/app/admin-x7kq92mpfw4rt8vz/ui.tsx`
- Test: `tests/leads-readiness.test.ts`

**Interfaces:**
- Consumes: `LeadCounts` (Task 1), `listCities` from `@/pipeline/admin-logic`, `leadCountsByCity`, `getSiteSettings`, `upsertSiteSettings` (Task 1).
- Produces: `type Readiness`, `siteReadiness(args): Readiness`, `ReadinessChips` in `ui.tsx`, `saveNotifyEmailsAction`.

- [ ] **Step 1: Write the failing readiness test**

Create `tests/leads-readiness.test.ts`:

```ts
// tests/leads-readiness.test.ts
import { describe, expect, it } from 'vitest'
import { siteReadiness } from '../src/leads/readiness'

const counts = { total: 0, unworked: 0, emailFailed: 0 }

describe('siteReadiness', () => {
  it('is ready when live, domain mapped and an inbox is set', () => {
    expect(
      siteReadiness({ isLive: true, domain: 'miamicleans.com', notifyEmails: ['a@b.c'], counts }),
    ).toEqual({ ready: true, problems: [], domain: 'miamicleans.com' })
  })

  it('reports a missing domain', () => {
    const result = siteReadiness({ isLive: true, domain: null, notifyEmails: ['a@b.c'], counts })
    expect(result.ready).toBe(false)
    expect(result.problems).toContain('no-domain')
  })

  it('reports a missing inbox', () => {
    const result = siteReadiness({
      isLive: true,
      domain: 'miamicleans.com',
      notifyEmails: [],
      counts,
    })
    expect(result.problems).toContain('no-inbox')
  })

  it('reports failed deliveries', () => {
    const result = siteReadiness({
      isLive: true,
      domain: 'miamicleans.com',
      notifyEmails: ['a@b.c'],
      counts: { total: 3, unworked: 1, emailFailed: 2 },
    })
    expect(result.problems).toContain('email-failures')
  })

  it('does not flag a draft site for having no domain', () => {
    const result = siteReadiness({ isLive: false, domain: null, notifyEmails: [], counts })
    expect(result.problems).toEqual([])
    expect(result.ready).toBe(true)
  })

  it('accumulates several problems at once', () => {
    const result = siteReadiness({
      isLive: true,
      domain: null,
      notifyEmails: [],
      counts: { total: 1, unworked: 1, emailFailed: 1 },
    })
    expect(result.problems.sort()).toEqual(['email-failures', 'no-domain', 'no-inbox'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/leads-readiness.test.ts`
Expected: FAIL, cannot resolve `../src/leads/readiness`.

- [ ] **Step 3: Write the implementation**

Create `src/leads/readiness.ts`:

```ts
// src/leads/readiness.ts
/*
 * "Can this site actually deliver a lead to a human?"
 *
 * Derived, never stored, so it cannot go stale. A DRAFT city is exempt from
 * the domain and inbox checks: it has not launched, so those are not problems
 * yet, and flagging them would train the operator to ignore the chips.
 */
import type { LeadCounts } from './types'

export type ReadinessProblem = 'no-domain' | 'no-inbox' | 'email-failures'

export type Readiness = {
  ready: boolean
  problems: ReadinessProblem[]
  domain: string | null
}

export function siteReadiness(args: {
  isLive: boolean
  domain: string | null
  notifyEmails: string[]
  counts: LeadCounts
}): Readiness {
  const problems: ReadinessProblem[] = []
  if (args.isLive && !args.domain) problems.push('no-domain')
  if (args.isLive && args.notifyEmails.length === 0) problems.push('no-inbox')
  if (args.counts.emailFailed > 0) problems.push('email-failures')
  return { ready: problems.length === 0, problems, domain: args.domain }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/leads-readiness.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Add the readiness chips**

Append to `src/app/admin-x7kq92mpfw4rt8vz/ui.tsx`:

```tsx
const PROBLEM_LABEL: Record<ReadinessProblem, string> = {
  'no-domain': 'NO DOMAIN',
  'no-inbox': 'NO INBOX',
  'email-failures': 'EMAIL FAILURES',
}

export function ReadinessChips({ readiness }: { readiness: Readiness }) {
  if (readiness.ready) {
    return (
      <span className="inline-block rounded-full border border-[#a8d8ba] bg-[#e6f4ea] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[#106b35]">
        READY
      </span>
    )
  }
  return (
    <span className="flex flex-wrap gap-1">
      {readiness.problems.map((problem) => (
        <span
          key={problem}
          className="inline-block rounded-full border border-[#f0b4b4] bg-[#fdeaea] px-2.5 py-0.5 text-[0.7rem] font-semibold text-[#a11212]"
        >
          {PROBLEM_LABEL[problem]}
        </span>
      ))}
    </span>
  )
}
```

Import `Readiness` and `ReadinessProblem` from `@/leads/readiness`.

- [ ] **Step 6: Write the site settings action and screen**

Create `src/app/admin-x7kq92mpfw4rt8vz/sites/site-actions.ts`:

```ts
'use server'
/*
 * Per-city notification settings. The domain mapping is deliberately NOT here:
 * it belongs to the runtime-domain-map plan, which is where the host index
 * moves out of content/_domains.json.
 */
import { revalidatePath } from 'next/cache'
import { upsertSiteSettings } from '@/leads/store'
import { ADMIN_BASE } from '../base'

export async function saveNotifyEmailsAction(cityKey: string, formData: FormData): Promise<void> {
  const raw = formData.get('emails')
  const emails =
    typeof raw === 'string'
      ? raw
          .split(/[\n,]/)
          .map((value) => value.trim())
          .filter((value) => value !== '' && value.includes('@'))
      : []
  await upsertSiteSettings(cityKey, emails)
  revalidatePath(`${ADMIN_BASE}/sites/${cityKey}`)
  revalidatePath(ADMIN_BASE)
}
```

Create `src/app/admin-x7kq92mpfw4rt8vz/sites/[key]/page.tsx`:

```tsx
import Link from 'next/link'
import { getSiteSettings } from '@/leads/store'
import { ADMIN_BASE } from '../../base'
import { BTN_PRIMARY, INPUT, LABEL, Panel } from '../../ui'
import { saveNotifyEmailsAction } from '../site-actions'

export const dynamic = 'force-dynamic'

export default async function SiteSettingsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const settings = await getSiteSettings(key)

  return (
    <>
      <h1 className="mb-6 text-[1.4rem] font-semibold tracking-tight">{key} settings</h1>

      <Panel title="Notification inboxes">
        <form action={saveNotifyEmailsAction.bind(null, key)}>
          <label htmlFor="emails" className={LABEL}>
            One address per line. Every lead from this city is emailed to all of them.
          </label>
          <textarea
            id="emails"
            name="emails"
            rows={4}
            defaultValue={(settings?.notifyEmails ?? []).join('\n')}
            placeholder="miami@example.com"
            className={INPUT}
          />
          <button type="submit" className={`${BTN_PRIMARY} mt-3`}>
            Save
          </button>
        </form>
        <p className="mt-3 text-[0.8rem] text-[#6b7680]">
          With no address here, leads are still saved but nobody is notified.
        </p>
      </Panel>

      <Link href={ADMIN_BASE} className="text-[0.85rem] text-[#6b7680]">
        Back to sites
      </Link>
    </>
  )
}
```

- [ ] **Step 7: Extend the Sites table**

In `src/app/admin-x7kq92mpfw4rt8vz/page.tsx`, load the extra data alongside
`listCities()`:

```tsx
  const [rows, counts] = await Promise.all([listCities(), leadCountsByCity()])
  const settings = await Promise.all(rows.map((row) => getSiteSettings(row.key)))
  const domains = (domainsJson as DomainsIndex).hosts
```

Add three `<th>` cells (`Domain`, `Leads`, `Config`) after `Status`, and the
matching `<td>` cells in the row map:

```tsx
                  <td className="px-4 py-3 text-[0.8rem]">
                    {domainFor(row.key, domains) ?? (
                      <span className="text-[#8a949d]">not attached</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`${ADMIN_BASE}/leads?city=${row.key}`} className="font-medium">
                      {counts[row.key]?.unworked ?? 0}
                    </Link>
                    <span className="ml-1 text-[0.75rem] text-[#8a949d]">
                      / {counts[row.key]?.total ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ReadinessChips
                      readiness={siteReadiness({
                        isLive: row.status === 'live',
                        domain: domainFor(row.key, domains),
                        notifyEmails: settings[index]?.notifyEmails ?? [],
                        counts: counts[row.key] ?? { total: 0, unworked: 0, emailFailed: 0 },
                      })}
                    />
                  </td>
```

Add a `Settings` link to the Actions cell:

```tsx
                      <Link href={`${ADMIN_BASE}/sites/${row.key}`} className={BTN}>
                        Settings
                      </Link>
```

Add the helper above the component:

```tsx
/** The first host mapped to this city, if any. */
function domainFor(cityKey: string, hosts: Record<string, string>): string | null {
  return Object.entries(hosts).find(([, value]) => value === cityKey)?.[0] ?? null
}
```

Change the row map's signature to `rows.map((row, index) => {` so `settings[index]`
resolves, and add the imports for `leadCountsByCity`, `getSiteSettings`,
`siteReadiness`, `ReadinessChips`, `domainsJson` and `DomainsIndex`.

- [ ] **Step 8: Verify**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 9: Check it by eye**

Confirm a LIVE city with no inbox shows `NO INBOX`, that setting an inbox flips
it to `READY`, and that the lead count links through to the filtered list.

- [ ] **Step 10: Stage, do not commit**

```bash
git add src/leads/readiness.ts tests/leads-readiness.test.ts src/app/admin-x7kq92mpfw4rt8vz
```

---

### Task 13: End-to-end coverage and the full gate

**Files:**
- Modify: `scripts/admin-e2e.mjs`
- Modify: `vitest.config.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

- [ ] **Step 1: Force STUB_EMAIL for the whole suite**

In `vitest.config.ts`, inside `test`, add:

```ts
    /*
     * No test may reach Resend. Set here rather than per-file so a new suite
     * cannot forget it and start sending real mail from CI.
     */
    env: { STUB_EMAIL: '1' },
```

- [ ] **Step 2: Add the submit-to-dashboard E2E case**

Extend `scripts/admin-e2e.mjs` with a case that, against the dev server:

1. Loads `/minneapolis/contact`.
2. Fills Name, Email, Phone, the select and the message, and submits.
3. Asserts the success panel text appears in place of the form.
4. Loads `{ADMIN_BASE}/leads` and asserts the submitted name is present with a
   `MINNEAPOLIS` pill.
5. Opens the lead, clicks `contacted`, and asserts the chip reads `CONTACTED`.
6. Saves a note and asserts it survives a reload.
7. Deletes the created row via Prisma so repeat runs stay clean.

Follow the existing script's structure and its assertion helpers. Note the
existing constraint recorded in the repo: the E2E script needs the **dev**
server, because `next start` inlines `_cities.json` into the proxy chunk.

- [ ] **Step 3: Run the whole gate**

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
node scripts/admin-e2e.mjs
```

Expected: all tests pass (the pre-existing 211 plus roughly 60 new), no type
errors, no lint errors, a clean build, and the E2E suite green.

- [ ] **Step 4: Confirm the public sites are unchanged**

Run the HTML crawler comparison used in previous rounds against the public
routes.
Expected: `EQUIVALENT`, with the sole exception of the hidden honeypot div on
the three form-bearing routes.

- [ ] **Step 5: Stage everything, do not commit**

```bash
git add -A
git status
```

Report the full working-tree state to the user and stop. The user decides
whether and when to commit.

---

## Self-Review

**Spec coverage:**

| Spec section | Covered by |
|---|---|
| §3.1 City attribution, Host-derived | Task 3, Task 7 step 1 |
| §3.1 Preview submissions as test rows | Task 3, Task 6 |
| §3.2 Data model, Lead + SiteSettings | Task 1 |
| §3.2 `DomainMapping` | **Deferred to the phase 5 plan.** Not a gap: the spec's §3.6 is that phase, and this plan's scope check split it out. |
| §3.3 Submission path, ordering | Task 6, pinned by three tests |
| §3.3 Honeypot, rate limit, IP hashing | Task 4, Task 7 step 4, Task 8 step 2 |
| §3.4 Email, one sending domain, per-city inboxes, reply-to | Task 5, Task 12 |
| §3.5 Sites tab, Leads tab, detail, settings, URL filters | Tasks 9 to 12 |
| §3.5 Readiness chips | Task 12 |
| §3.6 Runtime domain map | **Deferred to the phase 5 plan** |
| §4 Module layout | Task file structure, matches one-to-one |
| §5 Error handling table | Task 6 (storage, skipped, failed), Task 7 step 3 (customer-facing states), Task 9 (invalid filters) |
| §6 Testing | Every task, plus Task 13 |
| §7 Build sequence | Tasks 1 to 6 are phase 1 and 2; Tasks 9 to 11 are phase 3; Task 12 is phase 4 |
| §8 Configuration | Task 1 step 2 |
| §10 Security posture | Task 11 step 1 comment, Task 7 step 1 comment |
| §11 open item 4, rate-limit threshold | Resolved in Global Constraints: 5 per 10 minutes |

Open items 1, 2, 3, 5 and 6 from the spec are user actions or follow-ups, not
implementation work, and correctly have no task.

**Placeholder scan:** No `TBD`, no `TODO`, no "add error handling", no "similar
to Task N". Every code step carries the actual code. Task 13 step 2 describes
the E2E case in prose rather than code because it must follow the existing
script's helpers, which the implementer will have open; the seven assertions
are enumerated exactly.

**Type consistency:** `LeadInput`, `LeadRecord`, `LeadQuery`, `LeadCounts`,
`SiteSettingsRecord`, `FormType`, `LeadStatus`, `EmailStatus` are defined once
in Task 1 and used unchanged throughout. `SubmitPorts` (Task 6) names exactly
the store functions Task 1 exports. `attributeCity(host, renderedCityKey,
domains)` has the same argument order in Task 3, Task 6 and Task 7.
`parseLeadQuery` returns the `LeadQuery` that `listLeads` consumes.
`siteReadiness` consumes the `LeadCounts` that `leadCountsByCity` produces.

## Follow-up plan

Phase 5 of the spec, the runtime domain map, is a separate plan and is not
written yet. It covers `DomainMapping`, `src/content/domain-map.ts`, the cached
fallback chain, and moving `resolveRewrite`'s static imports to an awaited map.
It should be written and executed after this plan lands, because it changes a
code path that runs on every request to every site and deserves its own
review gate.
