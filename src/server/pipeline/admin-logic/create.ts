import { createDraft } from '@/server/content/drafts'
import { deriveFacts } from '@/server/pipeline/facts'
import type { MarketOps } from '@/server/pipeline/schemas'
import type { MarketProfile } from '@/server/content/types'
import { type CreateResult, errorMessage } from './shared'

// ── Create ──

// The ops block as the form holds it. Parsing is in buildOps so the create form and ops editor can't drift.
export type OpsFields = {
  /** Comma, space or newline separated. "77002, 77003" or one per line. */
  zips?: string
  /** A year, "2024"; a month is accepted too, "2024-03". */
  servingSince?: string
  /** First name only. */
  crewLead?: string
  crewSize?: string
  homesCleaned?: string
  /** One per line: `quote | first name | area | date?`. See parseReviews. */
  reviews?: string
  /** The owner's own line on insurance and bonding. */
  insurance?: string
  /** One per line: `label | https://...`. See parseProfiles. */
  profiles?: string
}

// /admin/new collects everything except reviews, which live on the settings screen
export type NewCityFields = Omit<OpsFields, 'reviews'> & {
  city: string
  state: string
  /** Any format — formatting characters are stripped here, not by the form. */
  phone: string
  address?: string
}

// ZIP paste -> five-digit codes; forgiving separators, anything else dropped
export function parseZips(raw: string | undefined): string[] {
  if (!raw) return []
  const found = raw.split(/[^0-9]+/).filter((t) => /^\d{5}$/.test(t))
  return [...new Set(found)].sort()
}

// bounds on the reviews field (untrusted RPC boundary)
export const MAX_REVIEWS = 10
export const MAX_REVIEWS_LENGTH = 8000
export const MAX_PROFILES = 10

export type ParseProfilesResult = { ok: true; profiles: MarketProfile[] } | { ok: false; error: string }

// Profiles: `label | https://...`, one per line. A bad line rejects the submission with its line number.
export function parseProfiles(raw: string | undefined): ParseProfilesResult {
  if (!raw || raw.trim() === '') return { ok: true, profiles: [] }
  const profiles: MarketProfile[] = []
  const lines = raw.split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (line === '') continue
    const shape = `profiles line ${i + 1}: expected "label | https://..."`
    const parts = line.split('|').map((part) => part.trim())
    if (parts.length !== 2 || parts[0] === '' || !/^https?:\/\/\S+$/i.test(parts[1])) {
      return { ok: false, error: shape }
    }
    profiles.push({ label: parts[0], url: parts[1] })
    if (profiles.length > MAX_PROFILES) {
      return { ok: false, error: `at most ${MAX_PROFILES} profiles can be saved` }
    }
  }
  return { ok: true, profiles }
}

export type MarketReview = NonNullable<MarketOps['reviews']>[number]

export type ParseReviewsResult =
  | { ok: true; reviews: MarketReview[] }
  | { ok: false; error: string }

/** Removes one matching pair of surrounding quote marks, straight or typographic. */
function unquote(value: string): string {
  const pairs: [string, string][] = [
    ['"', '"'],
    ['\u201c', '\u201d'],
    ["'", "'"],
    ['\u2018', '\u2019'],
  ]
  for (const [open, close] of pairs) {
    if (value.length >= 2 && value.startsWith(open) && value.endsWith(close)) {
      return value.slice(open.length, value.length - close.length).trim()
    }
  }
  return value
}

// Reviews: `quote | first name | area | date?`, one per line. Pipe because real reviews are full of commas and dashes.
// A bad line rejects the whole submission with its line number: a review is the one input that can't be reproduced.
export function parseReviews(raw: string | undefined): ParseReviewsResult {
  if (!raw || raw.trim() === '') return { ok: true, reviews: [] }
  if (raw.length > MAX_REVIEWS_LENGTH) {
    return { ok: false, error: `reviews are too long (over ${MAX_REVIEWS_LENGTH} characters)` }
  }

  const reviews: MarketReview[] = []
  const lines = raw.split(/\r?\n/)

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (line === '') continue

    const shape = `line ${i + 1}: expected "quote | first name | area" with an optional " | date"`
    const parts = line.split('|').map((part) => part.trim())
    if (parts.length < 3 || parts.length > 4) {
      return { ok: false, error: shape }
    }

    const quote = unquote(parts[0])
    const [, firstName, area, date] = parts
    if (quote === '' || firstName === '' || area === '') {
      return { ok: false, error: shape }
    }

    reviews.push({ quote, firstName, area, ...(date ? { date } : {}) })
    if (reviews.length > MAX_REVIEWS) {
      return { ok: false, error: `at most ${MAX_REVIEWS} reviews can be saved at once` }
    }
  }

  return { ok: true, reviews }
}

/** Parses a positive integer field, or undefined when blank or unusable. */
function parseCount(raw: string | undefined): number | undefined {
  const digits = (raw ?? '').replace(/[^0-9]/g, '')
  if (digits === '') return undefined
  const n = Number(digits)
  return Number.isSafeInteger(n) && n >= 0 ? n : undefined
}

export type BuildOpsResult =
  | { ok: true; ops: MarketOps | undefined }
  | { ok: false; error: string }

// raw form strings -> ops block, or undefined when empty (never {})
export function buildOps(fields: OpsFields): BuildOpsResult {
  const zips = parseZips(fields.zips)
  const servingSince = fields.servingSince?.trim()
  const crewLead = fields.crewLead?.trim()
  const crewSize = parseCount(fields.crewSize)
  const homesCleaned = parseCount(fields.homesCleaned)

  const insurance = fields.insurance?.trim()

  // Reviews and profiles can FAIL rather than come back empty, and the failure aborts the whole save — see
  // parseReviews for why.
  const parsed = parseReviews(fields.reviews)
  if (!parsed.ok) return { ok: false, error: parsed.error }
  const profiles = parseProfiles(fields.profiles)
  if (!profiles.ok) return { ok: false, error: profiles.error }

  const ops: MarketOps = {
    ...(zips.length ? { zips } : {}),
    ...(servingSince ? { servingSince } : {}),
    ...(crewLead ? { crewLead } : {}),
    ...(crewSize !== undefined ? { crewSize } : {}),
    ...(homesCleaned !== undefined ? { homesCleaned } : {}),
    ...(parsed.reviews.length ? { reviews: parsed.reviews } : {}),
    ...(insurance ? { insurance } : {}),
    ...(profiles.profiles.length ? { profiles: profiles.profiles } : {}),
  }
  return { ok: true, ops: Object.keys(ops).length ? ops : undefined }
}

// inverse of buildOps; round-trips
export function formatOpsFields(ops: MarketOps | undefined): OpsFields {
  if (!ops) return {}
  return {
    ...(ops.zips?.length ? { zips: ops.zips.join(', ') } : {}),
    ...(ops.servingSince ? { servingSince: ops.servingSince } : {}),
    ...(ops.crewLead ? { crewLead: ops.crewLead } : {}),
    ...(ops.crewSize !== undefined ? { crewSize: String(ops.crewSize) } : {}),
    ...(ops.homesCleaned !== undefined ? { homesCleaned: String(ops.homesCleaned) } : {}),
    ...(ops.reviews?.length
      ? {
          reviews: ops.reviews
            .map((r) => [r.quote, r.firstName, r.area, ...(r.date ? [r.date] : [])].join(' | '))
            .join('\n'),
        }
      : {}),
    ...(ops.insurance ? { insurance: ops.insurance } : {}),
    ...(ops.profiles?.length ? { profiles: ops.profiles.map((p) => `${p.label} | ${p.url}`).join('\n') } : {}),
  }
}

// form -> derived facts -> draft sidecar. Phone stripped to digits; empty optionals omitted.
export async function createDraftFromFields(fields: NewCityFields): Promise<CreateResult> {
  try {
    const digits = fields.phone.replace(/\D/g, '')
    const address = fields.address?.trim()

    const built = buildOps(fields)
    if (!built.ok) return { ok: false, error: built.error }

    const facts = deriveFacts({
      city: fields.city,
      state: fields.state.trim(),
      phoneDigits: digits,
      ...(address ? { address } : {}),
      ...(built.ops ? { ops: built.ops } : {}),
    })
    const key = await createDraft(facts)
    return { ok: true, key }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}
