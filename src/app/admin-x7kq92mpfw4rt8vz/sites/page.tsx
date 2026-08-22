import Link from 'next/link'
import { Building2, ExternalLink, MoreHorizontal, TriangleAlert } from 'lucide-react'
import domainsJson from '../../../../content/_domains.json'
import { listCities, type CityRow } from '@/pipeline/admin-logic'
import { STAGE_IDS } from '@/pipeline/stages'
import { leadQueryToSearch } from '@/leads/filters'
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
import { ADMIN_BASE } from '../base'
import { EmptyState, ReadinessChips, StatusChip } from '../ui'

/*
 * Dashboard. Reads the store directly (server component) rather than calling
 * listCitiesAction — an action is an RPC endpoint for the browser; on the
 * server the same work is a plain function call.
 *
 * force-dynamic because the whole list comes off disk and changes whenever the
 * operator does anything: a cached dashboard would show a city as GENERATING
 * after it went live.
 */
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

export default async function AdminDashboard() {
  const rows = await listCities()

  /*
   * Lead data is an ENHANCEMENT to this screen, not a prerequisite for it.
   * The cities table -- reading from disk/Blob via listCities() above -- has
   * nothing to do with the leads database and must keep working even when
   * Postgres is unreachable (a Neon outage, or a fresh clone with no
   * DATABASE_URL provisioned yet). Scoped to exactly these two store calls,
   * not the JSX below: a genuine rendering bug must still throw, not get
   * swallowed into a friendly banner.
   *
   * On failure: counts/settingsByCity stay empty and `leadsUnavailable`
   * flips true, which suppresses the leads column and the readiness chips
   * entirely below (see the row-rendering code) rather than computing them
   * from empty data -- an empty read would otherwise report 0 leads and
   * flag every live city as having no inbox, which is a lie, not a
   * degradation.
   */
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
    // Loud on purpose: an operator sees the banner below, but only the logs
    // say WHY. Never log lead contents here -- this catch only ever wraps
    // the two aggregate/settings queries above, neither of which returns
    // anything resembling a lead's PII, so the caught error itself is safe
    // to log in full.
    console.error('AdminDashboard: lead data unavailable (leadCountsByCity/getSiteSettingsMany failed):', err)
  }

  const domains = domainsJson as DomainsIndex

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.4rem] font-semibold tracking-tight">Sites</h1>
          <p className="mt-1 text-[0.85rem] text-muted-foreground">
            {rows.length} {rows.length === 1 ? 'site' : 'sites'} in the manager.
          </p>
        </div>
        <Button asChild size="lg" className="min-h-11 sm:min-h-9">
          <Link href={`${ADMIN_BASE}/new`}>+ New Site</Link>
        </Button>
      </div>

      {leadsUnavailable && (
        <Alert className="mb-4 border-amber-600/30 bg-amber-50 text-amber-900">
          <TriangleAlert className="size-4 text-amber-700" aria-hidden="true" />
          <AlertTitle>Lead data is unavailable</AlertTitle>
          <AlertDescription className="text-amber-800">
            Lead counts and readiness chips are not shown below. This is different from zero
            leads: it means the leads store could not be reached. The sites table and every
            action on it are unaffected.
          </AlertDescription>
        </Alert>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No sites yet"
          description="Start the pipeline for a new city and it will show up here."
          action={
            <Button asChild size="lg" className="min-h-11 sm:min-h-9">
              <Link href={`${ADMIN_BASE}/new`}>+ New Site</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Config</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const primary = primaryLink(row)
                  const previewable = row.status === 'live' || row.status === 'draft'
                  const domain = domainFor(row.key, domains)
                  // null, not a zeroed-out fallback, when the store read failed --
                  // computing either from empty counts/settings would render
                  // real-looking numbers and chips that are actually fabricated.
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
                  return (
                    <TableRow key={row.key}>
                      <TableCell>
                        <span className="font-medium">{row.city}</span>
                        <span className="ml-2 text-[0.75rem] text-muted-foreground">/{row.key}</span>
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
                        {cityCounts ? (
                          <>
                            <Link
                              href={`${ADMIN_BASE}/leads?${leadQueryToSearch({
                                city: row.key,
                                status: null,
                                formType: null,
                                includeTest: false,
                              })}`}
                              className="cursor-pointer font-medium hover:underline"
                            >
                              {cityCounts.unworked}
                            </Link>
                            <span className="ml-1 text-[0.75rem] text-muted-foreground">
                              / {cityCounts.total}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">unavailable</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {readiness ? (
                          <ReadinessChips readiness={readiness} />
                        ) : (
                          <span className="text-[0.75rem] text-muted-foreground">not available</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {/*
                          * One menu rather than three buttons per row. Five rows
                          * of three put fifteen equally-weighted controls on
                          * screen, which reads as noise and makes the row itself
                          * hard to scan. The mobile cards below deliberately keep
                          * the three buttons: there is room, they are already
                          * thumb-sized, and collapsing them into one small target
                          * would make touch worse rather than better.
                          */}
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
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => {
              const primary = primaryLink(row)
              const previewable = row.status === 'live' || row.status === 'draft'
              const domain = domainFor(row.key, domains)
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
              return (
                <div key={row.key} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{row.city}</p>
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
                  <div className="grid grid-cols-2 gap-2 text-[0.8rem]">
                    <div>
                      <p className="text-[0.7rem] text-muted-foreground uppercase">Domain</p>
                      <p>{domain ?? <span className="text-muted-foreground">not attached</span>}</p>
                    </div>
                    <div>
                      <p className="text-[0.7rem] text-muted-foreground uppercase">Leads</p>
                      {cityCounts ? (
                        <Link
                          href={`${ADMIN_BASE}/leads?${leadQueryToSearch({
                            city: row.key,
                            status: null,
                            formType: null,
                            includeTest: false,
                          })}`}
                          className="cursor-pointer font-medium hover:underline"
                        >
                          {cityCounts.unworked} / {cityCounts.total}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">unavailable</span>
                      )}
                    </div>
                  </div>
                  {readiness && (
                    <div>
                      <p className="mb-1 text-[0.7rem] text-muted-foreground uppercase">Readiness</p>
                      <ReadinessChips readiness={readiness} />
                    </div>
                  )}
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
        </>
      )}

      <p className="mt-4 text-[0.8rem] text-muted-foreground">
        Preview opens the city at its internal <code>/&lt;key&gt;</code> path. That unguessable
        URL is the preview, no login required. A LIVE city also answers on its own domain.
      </p>
    </>
  )
}
