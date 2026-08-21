// src/leads/store.ts
/*
 * The ONLY module in the codebase that imports Prisma.
 *
 * Everything above it speaks in src/leads/types.ts, which is why the ORM
 * choice stays reversible: swapping Prisma out touches this file and
 * prisma/schema.prisma, not the actions, the screens, or their tests.
 */
import { Prisma, PrismaClient, type Lead as PrismaLead } from '@prisma/client'
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
