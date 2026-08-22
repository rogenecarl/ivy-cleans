// src/leads/store.ts
/*
 * The ONLY module in the codebase that imports Prisma.
 *
 * Everything above it speaks in src/leads/types.ts, which is why the ORM
 * choice stays reversible: swapping Prisma out touches this file and
 * prisma/schema.prisma, not the actions, the screens, or their tests.
 */
import { setDefaultResultOrder } from 'node:dns'
import { setDefaultAutoSelectFamily } from 'node:net'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient, type Lead as PrismaLead } from '@/generated/prisma/client'
import { DB_DISABLE_HAPPY_EYEBALLS } from './env'
import type {
  EmailStatus,
  LeadStatusCounts,
  LeadCounts,
  LeadDashboardStats,
  LeadInput,
  LeadQuery,
  LeadRecord,
  LeadStatus,
  SiteSettingsRecord,
} from './types'

/*
 * Prisma 6's connections went through its own Rust engine binary; Prisma 7's
 * driver-adapter client routes them through Node's own `net` module instead,
 * via `pg`. In this repo's own sandbox, that surfaced as connections to
 * Neon's pooler hostname timing out (`ETIMEDOUT`) even though connecting
 * directly to one of its resolved IPv4 addresses succeeded instantly --
 * reproduced the same way against a second, unrelated Neon host from the
 * same sandbox, which is why DB_DISABLE_HAPPY_EYEBALLS exists as an opt-in
 * rather than being applied unconditionally: it is not certain this is safe
 * everywhere. In particular, whether Node's `fetch`/undici (used for Resend,
 * Anthropic, Vercel Blob) inherits this same process-wide default is NOT
 * verified here either way -- do not assume it is unaffected. See
 * src/leads/env.ts for the full explanation and example.env for when to
 * set it.
 */
if (DB_DISABLE_HAPPY_EYEBALLS) {
  setDefaultAutoSelectFamily(false)
  /*
   * BOTH calls, not just the first. Disabling the address race alone leaves
   * Node trying the resolver's order, which for a dual-stack host puts the
   * AAAA record first -- so on a machine with no IPv6 route every connection
   * still stalls on an unreachable IPv6 address before it ever reaches IPv4,
   * and the flag appears to do nothing.
   *
   * MEASURED, not theorised: against this project's own Neon pooler from a
   * sandbox with no IPv6 route, `pg` connecting by hostname failed with
   * ETIMEDOUT while a raw TCP connect to one of that host's resolved IPv4
   * addresses succeeded in 259ms. Adding this line took the same connection
   * from failing to succeeding in 1.9s.
   */
  setDefaultResultOrder('ipv4first')
}

/*
 * Prisma 7 has no built-in engine for driver-adapter clients (schema.prisma's
 * datasource carries no `url`); the client is handed a `@prisma/adapter-pg`
 * wrapping a real `pg` Pool instead, using the same pooled Neon connection
 * string the schema's `url` used to read directly.
 */
/*
 * Pool settings match trip-scheduler/src/lib/prisma.ts, the owner's other
 * Prisma 7 + Neon project, because these are not arbitrary: pg's defaults are
 * wrong for a serverless caller.
 *
 * connectionTimeoutMillis is the one that matters. Unset, pg-pool applies NO
 * connect timeout at all (`if (!this.options.connectionTimeoutMillis)` in
 * pg-pool/index.js) and a hung connect waits forever -- which in a Vercel
 * function means a customer's form submission hanging until the platform kills
 * it, instead of failing fast into the "call us instead" panel that submit.ts
 * already renders on a storage error. Bounded, a stalled database costs that
 * customer 30 seconds and a legible message.
 *
 * statement_timeout bounds a runaway query holding a pooled connection open.
 * idleTimeoutMillis raises pg's 10s default so a warm function reuses its
 * connection instead of reconnecting on every request.
 */
function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    statement_timeout: 30000,
  })
  const adapter = new PrismaPg(pool)
  /*
   * Without this, Prisma reports nothing: a failing query surfaces only as
   * whatever the caller does with the rejection. The store's callers turn a
   * failure into a friendly panel or a degraded dashboard, so the server log
   * is the only place the real cause is ever visible.
   */
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

/*
 * One client per process. Next's dev server re-evaluates modules on every
 * edit, which would otherwise open a new pool per reload until Neon refuses
 * connections, so the instance is parked on globalThis in development. This
 * matters even more now than under Prisma 6: the adapter holds a real `pg`
 * Pool with live TCP sockets, not just a lazily-connected engine handle.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Coerces a Prisma `Json` column's parsed value into the flat
 * Record<string, string> that LeadRecord.payload claims to be.
 *
 * `payload` is written today only from src/leads/schema.ts, which always
 * produces flat strings -- but the column's type is `Json`, which permits
 * anything JSON allows, and nothing enforces the shape on the way back out.
 * This is the one place that reads the column, so every consumer (this
 * file's toRecord, the lead detail screen, the email builder) is safe by
 * construction rather than trusting an unchecked cast. Latent today, not
 * live: worth fixing anyway, because the next writer will not know.
 */
export function coercePayload(value: unknown): Record<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string') {
      out[key] = entry
    } else if (entry === null || entry === undefined) {
      out[key] = ''
    } else {
      try {
        out[key] = JSON.stringify(entry)
      } catch {
        out[key] = String(entry)
      }
    }
  }
  return out
}

/**
 * Thrown by setLeadStatus/setLeadNotes when `id` matches no row (Prisma's
 * P2025). A plain Error subtype, not the Prisma error class itself, so
 * callers outside this file can distinguish "no such lead" from every other
 * database failure without importing Prisma -- this file is the only one
 * that does.
 */
export class LeadNotFoundError extends Error {
  constructor(id: string) {
    super(`no lead with id "${id}"`)
    this.name = 'LeadNotFoundError'
  }
}

function isMissingRowError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025'
}

function toRecord(row: PrismaLead): LeadRecord {
  return {
    id: row.id,
    cityKey: row.cityKey,
    formType: row.formType,
    name: row.name,
    email: row.email,
    phone: row.phone,
    payload: coercePayload(row.payload),
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

/**
 * How many leads sit at each pipeline stage, for the status filter chips.
 *
 * DELIBERATELY IGNORES query.status. The chips are the control that SETS
 * that filter, so counting with it applied would zero every chip except the
 * selected one the moment you clicked -- the row would stop describing the
 * pipeline and start describing itself. Every other filter (city, form, test
 * rows) IS applied, because those genuinely narrow which leads the chips
 * should be counting.
 *
 * Every stage is present in the result, including the ones with no leads:
 * a missing key would render as a gap in the pipeline rather than a zero,
 * and "0 quoted" is information.
 */
export async function leadStatusCounts(query: LeadQuery): Promise<LeadStatusCounts> {
  const rows = await prisma.lead.groupBy({
    by: ['status'],
    where: {
      ...(query.city ? { cityKey: query.city } : {}),
      ...(query.formType ? { formType: query.formType } : {}),
      ...(query.includeTest ? {} : { isTest: false }),
    },
    _count: { _all: true },
  })
  const counts: LeadStatusCounts = { new: 0, contacted: 0, quoted: 0, booked: 0, lost: 0 }
  for (const row of rows) counts[row.status] = row._count._all
  return counts
}

/**
 * How many rows the CURRENT filters would show if test rows were included.
 *
 * The dashboard hides test rows by default, so without this the operator has
 * no way to tell "there are genuinely no leads" from "everything here is
 * classified as a preview and hidden from you". That second state is exactly
 * how a whole city's real customers went unanswered behind a "0 / 0", so the
 * hidden count is now always on screen. Ignores query.includeTest by design:
 * it answers "how many are being hidden", not "what is displayed".
 */
export async function countTestLeads(query: LeadQuery): Promise<number> {
  return prisma.lead.count({
    where: {
      ...(query.city ? { cityKey: query.city } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.formType ? { formType: query.formType } : {}),
      isTest: true,
    },
  })
}

export async function getLead(id: string): Promise<LeadRecord | null> {
  const row = await prisma.lead.findUnique({ where: { id } })
  return row ? toRecord(row) : null
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<void> {
  try {
    await prisma.lead.update({ where: { id }, data: { status } })
  } catch (err) {
    if (isMissingRowError(err)) throw new LeadNotFoundError(id)
    throw err
  }
}

export async function setLeadNotes(id: string, notes: string): Promise<void> {
  try {
    await prisma.lead.update({ where: { id }, data: { notes } })
  } catch (err) {
    if (isMissingRowError(err)) throw new LeadNotFoundError(id)
    throw err
  }
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

/**
 * Every requested city's settings in one query, keyed by cityKey. A city
 * with no row is simply absent from the result -- same "not configured yet"
 * meaning as getSiteSettings returning null, just batched.
 *
 * For the Sites table (one row per city, every row needing its own
 * settings): calling getSiteSettings per row is an N+1 round trip, the same
 * shape leadCountsByCity already avoids for lead counts. This is that same
 * fix for settings.
 */
export async function getSiteSettingsMany(
  cityKeys: string[],
): Promise<Record<string, SiteSettingsRecord>> {
  if (cityKeys.length === 0) return {}
  const rows = await prisma.siteSettings.findMany({ where: { cityKey: { in: cityKeys } } })
  const out: Record<string, SiteSettingsRecord> = {}
  for (const row of rows) {
    out[row.cityKey] = { cityKey: row.cityKey, notifyEmails: row.notifyEmails }
  }
  return out
}

export async function upsertSiteSettings(cityKey: string, notifyEmails: string[]): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { cityKey },
    create: { cityKey, notifyEmails },
    update: { notifyEmails },
  })
}

/**
 * Every figure the dashboard shows, in one round trip's worth of counts.
 *
 * `now` is a PARAMETER, not `new Date()` read in here, so the week and month
 * boundaries are decided by the caller and the function is testable against a
 * fixed clock. A server component passes its own render time.
 *
 * All of it excludes test rows. A preview submission is not a customer, and
 * letting one inflate "booked this month" would make the dashboard lie in the
 * one direction nobody would think to check.
 *
 * Counts rather than findMany+filter throughout: see LeadDashboardStats for
 * why deriving these from listLeads() would silently go wrong past 200 rows.
 */
export async function leadDashboardStats(now: Date): Promise<LeadDashboardStats> {
  const day = 24 * 60 * 60 * 1000
  const weekAgo = new Date(now.getTime() - 7 * day)
  const twoWeeksAgo = new Date(now.getTime() - 14 * day)
  const monthAgo = new Date(now.getTime() - 30 * day)
  const real = { isTest: false as const }

  const [waiting, oldest, emailFailed, newThisWeek, newLastWeek, bookedLast30, booked, bookings, enquiries, cityRows] =
    await Promise.all([
      prisma.lead.count({ where: { ...real, status: 'new' } }),
      prisma.lead.findFirst({
        where: { ...real, status: 'new' },
        orderBy: { submittedAt: 'asc' },
        select: { submittedAt: true },
      }),
      prisma.lead.count({ where: { ...real, emailStatus: 'failed' } }),
      prisma.lead.count({ where: { ...real, submittedAt: { gte: weekAgo } } }),
      // The week BEFORE last: a half-open range, so a lead exactly on the
      // boundary is counted once rather than in both weeks.
      prisma.lead.count({
        where: { ...real, submittedAt: { gte: twoWeeksAgo, lt: weekAgo } },
      }),
      /*
       * Keyed off updatedAt, not submittedAt: "booked in the last 30 days"
       * is about when the BOOKING happened, and a lead that arrived in
       * January and booked today belongs in today's figure. updatedAt is an
       * approximation of that moment -- it moves on any later edit too --
       * and is the closest the current schema can get without a dedicated
       * bookedAt column.
       */
      prisma.lead.count({
        where: { ...real, status: 'booked', updatedAt: { gte: monthAgo } },
      }),
      prisma.lead.count({ where: { ...real, status: 'booked' } }),
      prisma.lead.count({ where: { ...real, formType: 'booking' } }),
      prisma.lead.count({ where: { ...real, formType: 'contact' } }),
      prisma.lead.groupBy({ by: ['cityKey'], where: real, _count: { _all: true } }),
    ])

  const byCity: Record<string, number> = {}
  for (const row of cityRows) byCity[row.cityKey] = row._count._all

  return {
    waiting,
    oldestWaitingAt: oldest?.submittedAt ?? null,
    emailFailed,
    newThisWeek,
    newLastWeek,
    bookedLast30,
    booked,
    bookings,
    enquiries,
    byCity,
  }
}
