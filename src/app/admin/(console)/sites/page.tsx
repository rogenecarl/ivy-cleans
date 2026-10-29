import Link from 'next/link'
import { Building2, ChevronLeft, ChevronRight, ExternalLink, MoreHorizontal, TriangleAlert } from 'lucide-react'
import { loadRouting } from '@/server/content/resolve-rewrite'
import { listSiteSummaries, type SiteSummary } from '@/server/pipeline/admin-logic'
import { domainFor, siteReadiness } from '@/server/leads/readiness'
import { getSiteSettingsMany, leadCountsByCity } from '@/server/leads/store'
import type { LeadCounts, SiteSettingsRecord } from '@/server/leads/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ADMIN_BASE, ADMIN_NEW, ADMIN_SITES } from '@/server/auth/admin-routes'
import { EmptyState, StagePill } from '@/app/admin/_components/ui'
import { filterSites, paginate, parseSiteQuery, siteFilterHref, siteStatusCounts, sortProblemsFirst } from './list-logic'
import { SiteStatusChips } from './site-status-chips'
import { SiteSearch } from './site-search'
import { requireAdmin } from '@/server/auth/auth-server'
import { cn } from '@/lib/utils'

// Every city, where it is in the process, and the one thing it needs next. force-dynamic: changes with every action.
export const dynamic = 'force-dynamic'

type View = SiteSummary & {
  domain: string | null
  inbox: number | null
  problemCount: number
}

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // own guard: admin-only
  await requireAdmin()

  const query = parseSiteQuery(await searchParams)
  const sites = await listSiteSummaries()

  // lead data is an enhancement: the table must survive a Postgres outage
  let counts: Record<string, LeadCounts> = {}
  let settingsByCity: Record<string, SiteSettingsRecord> = {}
  let leadsUnavailable = false
  try {
    ;[counts, settingsByCity] = await Promise.all([leadCountsByCity(), getSiteSettingsMany(sites.map((s) => s.key))])
  } catch (err) {
    leadsUnavailable = true
    // loud: this catch only wraps the two aggregate queries, no PII
    console.error('SitesPage: lead data unavailable:', err)
  }
  const { domains } = await loadRouting()

  const views: View[] = sites.map((site) => {
    const domain = domainFor(site.key, domains)
    const inbox = leadsUnavailable ? null : (settingsByCity[site.key]?.notifyEmails.length ?? 0)
    const readiness = leadsUnavailable
      ? null
      : siteReadiness({
          isLive: site.stage === 'live',
          domain,
          notifyEmails: settingsByCity[site.key]?.notifyEmails ?? [],
          counts: counts[site.key] ?? { total: 0, unworked: 0, emailFailed: 0 },
        })
    const stuck = site.stage === 'stopped' || site.stage === 'needs-review' ? 1 : 0
    return { ...site, domain, inbox, problemCount: (readiness?.problems.length ?? 0) + stuck }
  })

  const statusCounts = siteStatusCounts(views)
  const visible = sortProblemsFirst(filterSites(views, query))
  const filtersActive = query.status !== null || query.q !== ''
  const paged = paginate(visible, query.page)

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.4rem] font-semibold tracking-tight">Sites</h1>
          <p className="mt-1 text-[0.85rem] text-muted-foreground">
            {filtersActive
              ? `${visible.length} of ${views.length} ${views.length === 1 ? 'site' : 'sites'} shown.`
              : 'Every city, where it is in the process, and the one thing it needs next.'}
          </p>
        </div>
        <Button asChild size="lg" className="min-h-11 sm:min-h-9">
          <Link href={ADMIN_NEW}>New site</Link>
        </Button>
      </div>

      {leadsUnavailable && (
        <Alert className="mb-4 border-amber-600/30 bg-amber-50 text-amber-900">
          <TriangleAlert className="size-4 text-amber-700" aria-hidden="true" />
          <AlertTitle>Lead data is unavailable</AlertTitle>
          <AlertDescription className="text-amber-800">
            Inbox and lead details are not shown below because the leads store could not be reached. The sites
            themselves and every action on them are unaffected.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4">
        <SiteStatusChips query={query} counts={statusCounts} total={views.length} />
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
                filtersActive ? 'Try a different stage, or clear the search.' : 'Start a new city and it shows up here.'
              }
              action={
                filtersActive ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={ADMIN_SITES}>Clear filters</Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="min-h-11 sm:min-h-9">
                    <Link href={ADMIN_NEW}>New site</Link>
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>City</TableHead>
                    <TableHead>Where it is</TableHead>
                    <TableHead>Domain · inbox</TableHead>
                    <TableHead className="text-right">Next step</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.items.map((site) => (
                    <TableRow key={site.key} data-role="site-row">
                      <TableCell>
                        <span className="block font-medium">{site.city}</span>
                        <span className="text-[0.75rem] text-muted-foreground">/{site.key}</span>
                      </TableCell>
                      <TableCell className="max-w-72">
                        <Where site={site} />
                      </TableCell>
                      <TableCell className="text-[0.8rem]">
                        <DomainInbox site={site} />
                      </TableCell>
                      <TableCell>
                        <NextStep site={site} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 p-4 md:hidden">
              {paged.items.map((site) => (
                <div key={site.key} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                  <div>
                    <p className="font-medium">{site.city}</p>
                    <p className="text-[0.75rem] text-muted-foreground">/{site.key}</p>
                  </div>
                  <Where site={site} />
                  <p className="text-[0.8rem]">
                    <DomainInbox site={site} />
                  </p>
                  <NextStep site={site} />
                </div>
              ))}
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
        Preview opens the city at its internal <code>/&lt;key&gt;</code> path, no login required. A live city also
        answers on its own domain.
      </p>
    </>
  )
}

function Where({ site }: { site: View }) {
  const running = site.stage === 'generating' || site.stage === 'stopped'
  return (
    <div className="flex flex-col items-start gap-1.5">
      <StagePill stage={site.stage} />
      {running && (
        <span className="block h-1.5 w-40 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <span
            className={cn('block h-full rounded-full', site.stage === 'stopped' ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${Math.round(((site.doneCount ?? 0) / site.totalStages) * 100)}%` }}
          />
        </span>
      )}
      <span className="text-[0.75rem] text-muted-foreground">
        {site.reason ?? (running ? `${site.doneCount ?? 0} of ${site.totalStages} stages` : null)}
      </span>
    </div>
  )
}

function DomainInbox({ site }: { site: View }) {
  return (
    <>
      <span className={site.domain ? '' : 'text-muted-foreground'}>{site.domain ?? 'Not attached'}</span>
      {' · '}
      {site.inbox === null ? (
        <span className="text-muted-foreground">inbox unknown</span>
      ) : site.inbox === 0 ? (
        <span className={site.stage === 'live' ? 'font-semibold text-destructive' : 'text-muted-foreground'}>no inbox</span>
      ) : (
        <span>
          {site.inbox} {site.inbox === 1 ? 'inbox' : 'inboxes'}
        </span>
      )}
    </>
  )
}

function NextStep({ site }: { site: View }) {
  const primary = site.stage === 'ready' || site.stage === 'needs-review' || site.stage === 'stopped'
  return (
    <div className="flex items-center justify-end gap-2">
      <Button asChild size="sm" variant={primary ? 'default' : 'outline'} className="min-h-11 sm:min-h-8">
        <Link href={site.next.href} data-role="next-step">
          {site.next.label}
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="min-h-11 sm:min-h-8" aria-label={`More for ${site.city}`}>
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={`/${site.key}`} target="_blank" rel="noreferrer">
              Preview
              <ExternalLink className="ml-auto size-3.5" aria-hidden="true" />
            </a>
          </DropdownMenuItem>
          {site.stage !== 'live' && (
            <DropdownMenuItem asChild>
              <Link href={`${ADMIN_BASE}/review/${site.key}`}>Review</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`${ADMIN_BASE}/sites/${site.key}`}>Settings</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
