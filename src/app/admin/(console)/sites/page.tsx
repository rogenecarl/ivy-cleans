import Link from 'next/link'
import { Building2, ChevronLeft, ChevronRight, ClipboardCheck, ExternalLink, Eye, Settings, TriangleAlert } from 'lucide-react'
import { loadRouting } from '@/server/content/resolve-rewrite'
import { listSiteSummaries, type SiteSummary } from '@/server/pipeline/admin-logic'
import { domainFor, siteLink, siteReadiness } from '@/server/leads/readiness'
import { leadCountsByCity } from '@/server/leads/store'
import type { LeadCounts } from '@/server/leads/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ADMIN_BASE, ADMIN_NEW, ADMIN_SITES } from '@/server/auth/admin-routes'
import { EmptyState, StagePill } from '@/app/admin/_components/ui'
import { filterSites, paginate, parseSiteQuery, siteFilterHref, siteStatusCounts, sortProblemsFirst } from './list-logic'
import { SiteStatusChips } from './site-status-chips'
import { SiteSearch } from './site-search'
import { requireAdmin } from '@/server/auth/auth-server'
import { cn } from '@/lib/utils'

// Every city, its status, and what it needs next. force-dynamic: changes with every action.
export const dynamic = 'force-dynamic'

type View = SiteSummary & {
  domain: string | null
  link: string
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
  let leadsUnavailable = false
  try {
    counts = await leadCountsByCity()
  } catch (err) {
    leadsUnavailable = true
    // loud: this catch only wraps the aggregate query, no PII
    console.error('SitesPage: lead data unavailable:', err)
  }
  const { domains } = await loadRouting()

  const views: View[] = sites.map((site) => {
    const domain = domainFor(site.key, domains)
    const readiness = leadsUnavailable
      ? null
      : siteReadiness({
          isLive: site.stage === 'live',
          domain,
          counts: counts[site.key] ?? { total: 0, unworked: 0, emailFailed: 0 },
        })
    const stuck = site.stage === 'stopped' || site.stage === 'needs-review' ? 1 : 0
    return { ...site, domain, link: siteLink(site.key, site.stage === 'live', domains), problemCount: (readiness?.problems.length ?? 0) + stuck }
  })

  const statusCounts = siteStatusCounts(views)
  const visible = sortProblemsFirst(filterSites(views, query))
  const filtersActive = query.status !== null || query.q !== ''
  const paged = paginate(visible, query.page)

  return (
    <TooltipProvider>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.4rem] font-semibold tracking-tight">Sites</h1>
          <p className="mt-1 text-[0.85rem] text-muted-foreground">
            {filtersActive
              ? `${visible.length} of ${views.length} ${views.length === 1 ? 'site' : 'sites'} shown.`
              : 'Your city sites and what each one needs next.'}
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
            Lead details are not shown below because the leads store could not be reached. The sites
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
                    <TableHead>Status</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.items.map((site) => (
                    <TableRow key={site.key} data-role="site-row">
                      <TableCell className="font-medium">{site.city}</TableCell>
                      <TableCell className="max-w-72">
                        <Where site={site} />
                      </TableCell>
                      <TableCell className="text-[0.8rem]">
                        <Domain site={site} />
                      </TableCell>
                      <TableCell>
                        <Actions site={site} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 p-4 md:hidden">
              {paged.items.map((site) => (
                <div key={site.key} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                  <p className="font-medium">{site.city}</p>
                  <Where site={site} />
                  <p className="text-[0.8rem]">
                    <Domain site={site} />
                  </p>
                  <Actions site={site} />
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
    </TooltipProvider>
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

function Domain({ site }: { site: View }) {
  // a live city's domain opens the site; anything else is plain text
  if (site.link.startsWith('https://')) {
    return (
      <a
        href={site.link}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {site.domain}
        <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    )
  }
  return <span className="text-muted-foreground">{site.domain ?? 'No domain yet'}</span>
}

// one labelled button when something blocks the city, then icon links that are always there
function Actions({ site }: { site: View }) {
  const live = site.stage === 'live'
  const viewLabel = live && site.link.startsWith('https://') ? 'View live site' : 'Preview'
  return (
    <div className="flex items-center gap-1 md:justify-end">
      {!live && (
        <Button
          asChild
          size="sm"
          variant={site.stage === 'generating' ? 'outline' : 'default'}
          className="mr-1 min-h-11 sm:min-h-8"
        >
          <Link href={site.next.href} data-role="next-step">
            {site.next.label}
          </Link>
        </Button>
      )}
      <IconLink href={site.link} label={`${viewLabel}: ${site.city}`} tip={viewLabel} external>
        <Eye className="size-4" aria-hidden="true" />
      </IconLink>
      {!live && (
        <IconLink href={`${ADMIN_BASE}/review/${site.key}`} label={`Review ${site.city}`} tip="Review">
          <ClipboardCheck className="size-4" aria-hidden="true" />
        </IconLink>
      )}
      <IconLink href={`${ADMIN_BASE}/sites/${site.key}`} label={`Settings for ${site.city}`} tip="Settings">
        <Settings className="size-4" aria-hidden="true" />
      </IconLink>
    </div>
  )
}

function IconLink({
  href,
  label,
  tip,
  external = false,
  children,
}: {
  href: string
  label: string
  tip: string
  external?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="ghost" size="icon" className="size-11 sm:size-8">
          {external ? (
            <a href={href} target="_blank" rel="noreferrer" aria-label={`${label} (opens in a new tab)`}>
              {children}
            </a>
          ) : (
            <Link href={href} aria-label={label}>
              {children}
            </Link>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  )
}
