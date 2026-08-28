// src/leads/store.ts
/*
 * The only module that speaks Prisma's *query* API.
 *
 * The client itself now lives in src/lib/db.ts, because src/lib/auth.ts needs
 * the same one. Everything above this file still speaks src/leads/types.ts,
 * which is why the ORM choice stays reversible: swapping Prisma out touches
 * this file, src/lib/db.ts and prisma/schema.prisma — not the actions, the
 * screens, or their tests.
 */
import { Prisma, type Lead as PrismaLead } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
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

/** Re-exported so existing consumers and tests keep their import path. */
export { prisma }

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
