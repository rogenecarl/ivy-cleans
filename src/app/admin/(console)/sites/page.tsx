import Link from 'next/link'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  TriangleAlert,
} from 'lucide-react'
import domainsJson from '../../../../../content/_domains.json'
import { listCities, type CityRow } from '@/pipeline/admin-logic'
import { STAGE_IDS } from '@/pipeline/stages'
import { domainFor, siteReadiness, type DomainsIndex } from '@/leads/readiness'
import { getSiteSettingsMany, leadCountsByCity } from '@/leads/store'
import type { LeadCounts, SiteSettingsRecord } from '@/leads/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ADMIN_BASE, ADMIN_SITES } from '@/lib/admin-routes'
import { EmptyState, ReadinessMarker, StatusChip } from '../../ui'
import {
  filterSites,
  paginate,
  parseSiteQuery,
  siteFilterHref,
  siteStatusCounts,
  sortProblemsFirst,
} from './list-logic'
import { SiteStatusChips } from './status-chips'
import { SiteSearch } from './site-search'
import { requireAdmin } from '@/lib/auth-server'

// Sites list. Reads the store directly (server component). force-dynamic: the list changes with every operator action.
export const dynamic = 'force-dynamic'

/** Where the primary action for each row leads. */
function primaryLink(row: CityRow): { href: string; label: string } {
  if (row.status === 'generating') {
    return { href: `${ADMIN_BASE}/generate/${row.key}`, label: 'Resume' }
  }
  if (row.status === 'draft-unfinalized') {
    return { href: `${ADMIN_BASE}/generate/${row.key}`, label: 'Finish' }
  }
  return { href: `${ADMIN_BASE}/review/${row.key}`, label: 'Review' }
}

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // own guard: admin-only
  await requireAdmin()

  const query = parseSiteQuery(await searchParams)
  const rows = await listCities()

  // lead data is an enhancement: the cities table must survive a Postgres outage. On failure `leadsUnavailable`
  // suppresses the readiness chips rather than computing them from empty data.
  let counts: Record<string, LeadCounts> = {}
  let settingsByCity: Record<string, SiteSettingsRecord> = {}
  let leadsUnavailable = false
  try {
    // One query for every row's settings, not one query per row (was N+1).
    ;[counts, settingsByCity] = await Promise.all([
      leadCountsByCity(),
      getSiteSettingsMany(rows.map((row) => row.key)),
    ])
  } catch (err) {
    leadsUnavailable = true
    // loud: this catch only wraps the two aggregate queries, no PII
    console.error('AdminDashboard: lead data unavailable (leadCountsByCity/getSiteSettingsMany failed):', err)
  }

  const domains = domainsJson as DomainsIndex

  // each row's derived facts, computed once for the table, the cards and the sort
  const viewRows = rows.map((row) => {
    const domain = domainFor(row.key, domains)
    // null, not zeroes, when the store read failed
    const cityCounts = leadsUnavailable
      ? null
      : (counts[row.key] ?? { total: 0, unworked: 0, emailFailed: 0 })
    const readiness =
      leadsUnavailable || cityCounts === null
        ? null
        : siteReadiness({
            isLive: row.status === 'live',
            domain,
            notifyEmails: settingsByCity[row.key]?.notifyEmails ?? [],
            counts: cityCounts,
          })
    return {
      row,
      domain,
      cityCounts,
      readiness,
      primary: primaryLink(row),
      previewable: row.status === 'live' || row.status === 'draft',
      // an `error` site is a problem even when readiness is unavailable
      problemCount: (readiness?.problems.length ?? 0) + (row.status === 'error' ? 1 : 0),
    }
  })

  const statusCounts = siteStatusCounts(rows)
  const visible = sortProblemsFirst(
    filterSites(
      viewRows.map((v) => ({ ...v, key: v.row.key, city: v.row.city, status: v.row.status })),
      query,
    ),
  )
  const filtersActive = query.status !== null || query.q !== ''
  const paged = paginate(visible, query.page)

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.4rem] font-semibold tracking-tight">Sites</h1>
          <p className="mt-1 text-[0.85rem] text-muted-foreground">
            {filtersActive
              ? `${visible.length} of ${rows.length} ${rows.length === 1 ? 'site' : 'sites'} shown.`
              : `${rows.length} ${rows.length === 1 ? 'site' : 'sites'} in the manager.`}
          </p>
        </div>
        <Button asChild size="lg" className="min-h-11 sm:min-h-9">
          <Link href={`${ADMIN_BASE}/new`}>Create Site</Link>
        </Button>
      </div>

      {leadsUnavailable && (
        <Alert className="mb-4 border-amber-600/30 bg-amber-50 text-amber-900">
          <TriangleAlert className="size-4 text-amber-700" aria-hidden="true" />
          <AlertTitle>Lead data is unavailable</AlertTitle>
          <AlertDescription className="text-amber-800">
            Readiness chips are not shown below. This is different from a healthy site: it
            means the leads store could not be reached. The sites table and every action on it
            are unaffected.
          </AlertDescription>
        </Alert>
      )}

      {/* Status doubles as the filter, mirroring the Leads screen's chips. */}
      <div className="mb-4">
        <SiteStatusChips query={query} counts={statusCounts} total={rows.length} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h2 className="text-[0.95rem] font-semibold">All sites</h2>
          <SiteSearch query={query} />
        </div>

      {visible.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={Building2}
            title={filtersActive ? 'No sites match these filters' : 'No sites yet'}
            description={
              filtersActive
                ? 'Try a different status, or clear the search.'
                : 'Start the pipeline for a new city and it will show up here.'
            }
            action={
              filtersActive ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={ADMIN_SITES}>Clear filters</Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="min-h-11 sm:min-h-9">
                  <Link href={`${ADMIN_BASE}/new`}>Create Site</Link>
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.items.map(({ row, primary, previewable, domain, readiness }) => {
                  return (
                    <TableRow key={row.key}>
                      <TableCell>
                        <span className="font-medium">{row.city}</span>
                        <span className="ml-2 text-[0.75rem] text-muted-foreground">/{row.key}</span>
                        {/* Why this row sorted to the top. Renders nothing when
                          * the site is healthy. */}
                        <ReadinessMarker readiness={readiness} />
                        {row.error && (
                          <span className="ml-2 text-[0.75rem] text-destructive">{row.error}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={row.status} />
                        {row.status === 'generating' && (
                          <span className="ml-2 text-[0.75rem] text-muted-foreground">
                            {row.doneCount ?? 0}/{STAGE_IDS.length} stages
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-[0.8rem]">
                        {domain ?? <span className="text-muted-foreground">not attached</span>}
                      </TableCell>
                      <TableCell>
                        {/* one menu, not three buttons per row; the mobile cards keep the buttons (thumb-sized) */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="min-h-8 cursor-pointer"
                              aria-label={`Actions for ${row.city}`}
                            >
                              <MoreHorizontal className="size-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {previewable && (
                              <DropdownMenuItem asChild>
                                <a href={`/${row.key}`} target="_blank" rel="noreferrer">
                                  <ExternalLink className="size-3.5" aria-hidden="true" />
                                  Preview
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <Link href={primary.href}>{primary.label}</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`${ADMIN_BASE}/sites/${row.key}`}>Settings</Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 p-4 md:hidden">
            {paged.items.map(({ row, primary, previewable, domain, readiness }) => {
              return (
                <div key={row.key} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {row.city}
                        <ReadinessMarker readiness={readiness} />
                      </p>
                      <p className="text-[0.75rem] text-muted-foreground">/{row.key}</p>
                    </div>
                    <StatusChip status={row.status} />
                  </div>
                  {row.error && <p className="text-[0.8rem] text-destructive">{row.error}</p>}
                  {row.status === 'generating' && (
                    <p className="text-[0.8rem] text-muted-foreground">
                      {row.doneCount ?? 0}/{STAGE_IDS.length} stages done
                    </p>
                  )}
                  <div className="text-[0.8rem]">
                    <p className="text-[0.7rem] text-muted-foreground uppercase">Domain</p>
                    <p>{domain ?? <span className="text-muted-foreground">not attached</span>}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {previewable && (
                      <Button asChild variant="outline" size="sm" className="min-h-11">
                        <a href={`/${row.key}`} target="_blank" rel="noreferrer">
                          Preview
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </a>
                      </Button>
                    )}
                    <Button asChild variant="outline" size="sm" className="min-h-11">
                      <Link href={primary.href}>{primary.label}</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="min-h-11">
                      <Link href={`${ADMIN_BASE}/sites/${row.key}`}>Settings</Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3">
            <p className="text-[0.8rem] text-muted-foreground">
              Showing {paged.from}&ndash;{paged.to} of {paged.total}
            </p>
            {paged.pageCount > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild={paged.page > 1} disabled={paged.page <= 1}>
                  {paged.page > 1 ? (
                    <Link href={siteFilterHref(query, 'page', String(paged.page - 1))}>
                      <ChevronLeft className="size-4" aria-hidden="true" />
                      Previous
                    </Link>
                  ) : (
                    <span>
                      <ChevronLeft className="size-4" aria-hidden="true" />
                      Previous
                    </span>
                  )}
                </Button>
                <span className="text-[0.8rem] text-muted-foreground">
                  Page {paged.page} of {paged.pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  asChild={paged.page < paged.pageCount}
                  disabled={paged.page >= paged.pageCount}
                >
                  {paged.page < paged.pageCount ? (
                    <Link href={siteFilterHref(query, 'page', String(paged.page + 1))}>
                      Next
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span>
                      Next
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
      </div>

      <p className="mt-4 text-[0.8rem] text-muted-foreground">
        Preview opens the city at its internal <code>/&lt;key&gt;</code> path. That unguessable
        URL is the preview, no login required. A LIVE city also answers on its own domain.
      </p>
    </>
  )
}
