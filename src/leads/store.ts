// src/leads/store.ts
// The only module that speaks Prisma's query API; the client lives in src/lib/db.ts. Everything above speaks types.ts.
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

// coerce the Json column into the flat Record<string, string> payload claims to be
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

// thrown for Prisma P2025 so callers can tell "no such lead" apart without importing Prisma
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

// counts per stage for the status chips. Ignores query.status (the chips SET that filter); every stage present.
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

// how many rows the current filters would show if test rows were included — so hidden leads are never silent
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

// settings for every requested city in one query (avoids N+1 on the Sites table)
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

// every dashboard figure via COUNT, not findMany (listLeads caps at 200). `now` is a parameter for testability.
// Test rows excluded throughout.
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
      // keyed off updatedAt: "booked in the last 30 days" is about when the booking happened
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
