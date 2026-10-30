// src/server/leads/store.ts
// The only module that speaks Prisma's query API; the client lives in src/server/infra/db.ts. Everything above speaks types.ts.
import { Prisma, type Lead as PrismaLead } from '@/generated/prisma/client'
import { prisma } from '@/server/infra/db'
import { bucketByWeek } from './weeks'
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

// the filters the leads screens share; `status: false` drops the status filter (the chips set it)
function leadWhere(query: LeadQuery, opts: { status?: boolean } = {}): Prisma.LeadWhereInput {
  return {
    ...(query.city ? { cityKey: query.city } : {}),
    ...(query.status && opts.status !== false ? { status: query.status } : {}),
    ...(query.formType ? { formType: query.formType } : {}),
    isTest: false,
  }
}

export async function listLeads(query: LeadQuery, take = 200): Promise<LeadRecord[]> {
  const rows = await prisma.lead.findMany({
    where: leadWhere(query),
    orderBy: { submittedAt: 'desc' },
    take,
  })
  return rows.map(toRecord)
}

// counts per stage for the status chips. Ignores query.status (the chips SET that filter); every stage present.
export async function leadStatusCounts(query: LeadQuery): Promise<LeadStatusCounts> {
  const rows = await prisma.lead.groupBy({
    by: ['status'],
    where: leadWhere(query, { status: false }),
    _count: { _all: true },
  })
  const counts: LeadStatusCounts = { new: 0, contacted: 0, quoted: 0, booked: 0, lost: 0 }
  for (const row of rows) counts[row.status] = row._count._all
  return counts
}

export async function getLead(id: string): Promise<LeadRecord | null> {
  const row = await prisma.lead.findUnique({ where: { id } })
  return row ? toRecord(row) : null
}

async function updateLead(id: string, data: Prisma.LeadUpdateInput): Promise<void> {
  try {
    await prisma.lead.update({ where: { id }, data })
  } catch (err) {
    if (isMissingRowError(err)) throw new LeadNotFoundError(id)
    throw err
  }
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<void> {
  await updateLead(id, { status })
}

export async function setLeadNotes(id: string, notes: string): Promise<void> {
  await updateLead(id, { notes })
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
  const rows = await prisma.lead.groupBy({
    by: ['cityKey', 'status', 'emailStatus'],
    where: { isTest: false },
    _count: { _all: true },
  })
  const out: Record<string, LeadCounts> = {}
  for (const row of rows) {
    const n = row._count._all
    const bucket = (out[row.cityKey] ??= { total: 0, unworked: 0, emailFailed: 0 })
    bucket.total += n
    if (row.status !== 'booked' && row.status !== 'lost') bucket.unworked += n
    if (row.emailStatus === 'failed') bucket.emailFailed += n
  }
  return out
}

// leads per week, oldest first, for the dashboard chart; only the dates leave the database
export async function leadsPerWeek(now: Date, weeks: number, cityKey?: string): Promise<number[]> {
  const since = new Date(now.getTime() - weeks * 7 * 86_400_000)
  const rows = await prisma.lead.findMany({
    where: { isTest: false, submittedAt: { gte: since, lte: now }, ...(cityKey ? { cityKey } : {}) },
    select: { submittedAt: true },
  })
  return bucketByWeek(
    rows.map((r) => r.submittedAt),
    now,
    weeks,
  )
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
