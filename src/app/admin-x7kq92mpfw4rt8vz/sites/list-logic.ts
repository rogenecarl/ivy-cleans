// src/app/admin-x7kq92mpfw4rt8vz/sites/list-logic.ts
/*
 * The Sites LIST's filtering, counting and ordering, as pure functions.
 *
 * Separate from logic.ts, which parses the notify-email settings form: that
 * module is about one site's configuration, this one is about finding a site
 * among many. Two unrelated jobs, two files.
 *
 * Filters live in the URL rather than in client state, matching the Leads
 * screen: a filtered view stays bookmarkable, the back button works, and the
 * table itself can stay a server component with its domain/readiness/lead-count
 * computation intact.
 */
import type { CityStatus } from '@/pipeline/admin-logic'
import { ADMIN_SITES } from '../base'

export const SITE_STATUSES: readonly CityStatus[] = [
  'live',
  'draft',
  'draft-unfinalized',
  'generating',
  'error',
]

export type SiteQuery = {
  status: CityStatus | null
  /** Free-text match over city name, url key and domain. '' means no search. */
  q: string
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * Reads the URL into a SiteQuery, discarding anything unrecognised.
 *
 * An unknown status is dropped rather than passed through, so a hand-edited
 * or stale URL shows every site instead of silently showing none -- an empty
 * table reads as "there are no sites", which is a worse lie than ignoring a
 * bad parameter.
 */
export function parseSiteQuery(params: Record<string, string | string[] | undefined>): SiteQuery {
  const rawStatus = firstParam(params.status)
  const status = SITE_STATUSES.find((s) => s === rawStatus) ?? null
  const q = (firstParam(params.q) ?? '').trim()
  return { status, q }
}

/** Serialises a SiteQuery back to a query string, omitting empty values so a
 * cleared filter leaves a clean URL rather than `?status=&q=`. */
export function siteQueryToSearch(query: SiteQuery): string {
  const params = new URLSearchParams()
  if (query.status) params.set('status', query.status)
  if (query.q !== '') params.set('q', query.q)
  return params.toString()
}

/** An href that keeps every current filter except the one being set, the same
 * contract as the Leads screen's filterHref. */
export function siteFilterHref(
  query: SiteQuery,
  key: 'status' | 'q',
  value: string | null,
): string {
  const next: SiteQuery = { ...query }
  if (key === 'status') next.status = (SITE_STATUSES.find((s) => s === value) ?? null) as CityStatus | null
  else next.q = value ?? ''
  const search = siteQueryToSearch(next)
  return `${ADMIN_SITES}${search ? `?${search}` : ''}`
}

/** The minimum a row needs for filtering, so this module never imports the
 * page's full view model. */
export type FilterableSite = {
  key: string
  city: string
  status: CityStatus
  domain: string | null
}

/**
 * Applies the query. Search matches city name, url key or domain, so an
 * operator can find a site by whichever of the three they happen to remember.
 */
export function filterSites<T extends FilterableSite>(rows: T[], query: SiteQuery): T[] {
  const q = query.q.toLowerCase()
  return rows.filter((row) => {
    if (query.status !== null && row.status !== query.status) return false
    if (q === '') return true
    return (
      row.city.toLowerCase().includes(q) ||
      row.key.toLowerCase().includes(q) ||
      (row.domain?.toLowerCase().includes(q) ?? false)
    )
  })
}

/** Every status with at least the zero, for the filter chips. Counts the
 * UNFILTERED set by status, for the same reason the Leads chips do: counting
 * the filtered set would zero every chip but the selected one. */
export function siteStatusCounts(rows: { status: CityStatus }[]): Record<CityStatus, number> {
  const counts: Record<CityStatus, number> = {
    live: 0,
    draft: 0,
    'draft-unfinalized': 0,
    generating: 0,
    error: 0,
  }
  for (const row of rows) counts[row.status] += 1
  return counts
}

/**
 * Sites with something wrong first, then everything else alphabetically.
 *
 * Recency is the right order for leads; it is the wrong one here. The only
 * reason to open this screen is a site that is broken or not launched, and a
 * city with NO INBOX buried alphabetically under twenty healthy ones is how it
 * stays broken. `problemCount` is supplied by the caller because computing it
 * needs lead data this module has no business importing.
 *
 * Stable and total: ties break on city name, so the order cannot change
 * between two renders of the same data.
 */
export function sortProblemsFirst<T extends { city: string; problemCount: number }>(
  rows: T[],
): T[] {
  return [...rows].sort(
    (a, b) => b.problemCount - a.problemCount || a.city.localeCompare(b.city),
  )
}
