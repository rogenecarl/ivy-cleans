// src/app/admin/(console)/sites/list-logic.ts
// The Sites list's filtering, counting and ordering as pure functions. Filters live in the URL, like the Leads screen.
import type { CityStatus } from '@/pipeline/admin-logic'
import { ADMIN_SITES } from '@/lib/admin-routes'

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
  /** 1-based. Always at least 1; see parseSiteQuery. */
  page: number
}

/** Rows per page, matching the Leads table and peaktransport's. */
export const SITES_PAGE_SIZE = 50

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

// URL -> SiteQuery; an unknown status is dropped so a stale URL shows every site rather than none
export function parseSiteQuery(params: Record<string, string | string[] | undefined>): SiteQuery {
  const rawStatus = firstParam(params.status)
  const status = SITE_STATUSES.find((s) => s === rawStatus) ?? null
  const q = (firstParam(params.q) ?? '').trim()
  // anything but a positive whole number is page 1 (NaN would slice to empty)
  const rawPage = Number(firstParam(params.page) ?? '1')
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  return { status, q, page }
}

/** Serialises a SiteQuery back to a query string, omitting empty values so a
 * cleared filter leaves a clean URL rather than `?status=&q=`. */
export function siteQueryToSearch(query: SiteQuery): string {
  const params = new URLSearchParams()
  if (query.status) params.set('status', query.status)
  if (query.q !== '') params.set('q', query.q)
  // Page 1 is the default, so it stays out of the URL entirely.
  if (query.page > 1) params.set('page', String(query.page))
  return params.toString()
}

/** An href that keeps every current filter except the one being set, the same
 * contract as the Leads screen's filterHref. */
export function siteFilterHref(
  query: SiteQuery,
  key: 'status' | 'q' | 'page',
  value: string | null,
): string {
  const next: SiteQuery = { ...query }
  if (key === 'page') {
    const parsed = Number(value ?? '1')
    next.page = Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
  } else {
    // changing a filter resets to page 1
    next.page = 1
    if (key === 'status') {
      next.status = (SITE_STATUSES.find((s) => s === value) ?? null) as CityStatus | null
    } else {
      next.q = value ?? ''
    }
  }
  const search = siteQueryToSearch(next)
  return `${ADMIN_SITES}${search ? `?${search}` : ''}`
}

// one page of rows; `page` is clamped since rows can disappear between URL and render
export function paginate<T>(
  rows: T[],
  page: number,
  pageSize: number = SITES_PAGE_SIZE,
): { items: T[]; page: number; pageCount: number; from: number; to: number; total: number } {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * pageSize
  const items = rows.slice(start, start + pageSize)
  return {
    items,
    page: current,
    pageCount,
    // 1-based and inclusive, to read as "Showing 1-50 of 1041". An empty list
    // reports 0-0 rather than 1-0.
    from: items.length === 0 ? 0 : start + 1,
    to: start + items.length,
    total: rows.length,
  }
}

/** The minimum a row needs for filtering, so this module never imports the
 * page's full view model. */
export type FilterableSite = {
  key: string
  city: string
  status: CityStatus
  domain: string | null
}

// search matches city name, key or domain
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

/** Counts per status over the UNFILTERED set, for the chips. */
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

// problems first, then alphabetical; stable and total. `problemCount` supplied by the caller.
export function sortProblemsFirst<T extends { city: string; problemCount: number }>(
  rows: T[],
): T[] {
  return [...rows].sort(
    (a, b) => b.problemCount - a.problemCount || a.city.localeCompare(b.city),
  )
}

// live and draft always show; generating / draft-unfinalized / error only when non-zero — except the selected one, which always shows
export function visibleStatuses(
  counts: Record<CityStatus, number>,
  active: CityStatus | null,
): CityStatus[] {
  const alwaysShown: CityStatus[] = ['live', 'draft']
  return SITE_STATUSES.filter(
    (status) => alwaysShown.includes(status) || counts[status] > 0 || active === status,
  )
}
