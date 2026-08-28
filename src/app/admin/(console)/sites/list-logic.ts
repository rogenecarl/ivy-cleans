// src/app/admin/(console)/sites/list-logic.ts
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
  /*
   * Anything that is not a positive whole number becomes page 1 rather than
   * NaN or 0. A NaN page silently slices to an empty array, which renders as
   * "no sites match" -- a hand-mangled URL should show the first page, not
   * claim the list is empty.
   */
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
    /*
     * CHANGING A FILTER RESETS TO PAGE 1. Without this, narrowing from 200
     * sites to 3 while on page 4 lands on an empty page that reads as "no
     * sites match these filters" -- the filter looks broken when it worked
     * perfectly.
     */
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

/**
 * One page of rows, plus the numbers the footer prints.
 *
 * `page` is CLAMPED to the available range rather than trusted: rows can
 * disappear between the URL being built and the page rendering (a site
 * published, a filter applied), and a page number past the end would slice to
 * nothing and read as an empty list.
 */
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

/**
 * Which status chips to render.
 *
 * `live` and `draft` are the steady states every install has, so they always
 * show -- a zero there is real information ("nothing is published yet").
 *
 * The other three are not a workflow anyone tracks. `generating` exists for
 * about two minutes while a city is being built; `draft-unfinalized` and
 * `error` are recovery states. On a healthy system all three sit at zero
 * permanently, and three chips that always read "0" are decoration. They
 * appear only when they have something in them -- the same rule the
 * dashboard's alarm tiles follow, so a chip showing up at all means
 * something happened.
 *
 * A status that is CURRENTLY SELECTED always shows, even at zero. Hiding it
 * would strand the operator on a filtered view with no chip to show what the
 * filter is or to click back out of it.
 */
export function visibleStatuses(
  counts: Record<CityStatus, number>,
  active: CityStatus | null,
): CityStatus[] {
  const alwaysShown: CityStatus[] = ['live', 'draft']
  return SITE_STATUSES.filter(
    (status) => alwaysShown.includes(status) || counts[status] > 0 || active === status,
  )
}
