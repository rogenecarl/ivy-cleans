import Link from 'next/link'
import { Inbox, SearchX, TriangleAlert } from 'lucide-react'
import { listCities } from '@/pipeline/admin-logic'
import { parseLeadQuery } from '@/leads/filters'
import { countTestLeads, listLeads } from '@/leads/store'
import type { LeadRecord } from '@/leads/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ADMIN_BASE } from '../base'
import { EmptyState, LeadStatusChip, Pill } from '../ui'
import { buildCityLookup, cityDisplayName, filterHref } from './logic'
import { LeadFilters } from './lead-filters'

/*
 * force-dynamic for the same reason the Sites screen uses it: the list changes
 * whenever a customer submits or the operator moves a lead, and a cached
 * dashboard would show stale counts.
 */
export const dynamic = 'force-dynamic'

function relative(from: Date): string {
  const mins = Math.round((Date.now() - from.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.round(hours / 24)} d ago`
}

/** Whichever of phone/email the row has, as a tel:/mailto: link so a lead is
 * one tap to dial (or email) on a phone -- falls back to plain text with no
 * contact info at all. */
function ContactLine({ lead }: { lead: LeadRecord }) {
  // pointer-events-auto: this row/card's other content is pointer-events-none
  // so clicks fall through to the full-row/card stretched Link underneath
  // (see the comment above the Table body below) -- this is the one target
  // inside that area that must keep intercepting clicks, so tapping the
  // phone number dials instead of opening the lead.
  if (lead.phone) {
    return (
      <a
        href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}
        className="pointer-events-auto cursor-pointer hover:underline"
      >
        {lead.phone}
      </a>
    )
  }
  if (lead.email) {
    return (
      <a href={`mailto:${lead.email}`} className="pointer-events-auto cursor-pointer hover:underline">
        {lead.email}
      </a>
    )
  }
  return <>No contact info</>
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = parseLeadQuery(params)
  const cities = await listCities()
  const cityLookup = buildCityLookup(cities)

  /*
   * Unlike the Sites screen, this screen has no useful content once the
   * store is unreachable -- it exists to list, filter and open leads, and
   * every one of those needs a working database. So it does not degrade;
   * it fails legibly instead of the raw 500 an uncaught throw here would
   * produce. Scoped to exactly this call, per the Sites-screen precedent.
   */
  let leads: LeadRecord[] = []
  let testCount = 0
  let leadsError = false
  try {
    /*
     * Both in the same try: the test count is not decoration, it is the
     * safety net. Spec 3.1 promised test rows would be hidden BEHIND A
     * TOGGLE, and until now nothing rendered one -- so a lead classified as a
     * test row was invisible on every screen with no control to reveal it and
     * no hint that anything was being withheld. The count and the toggle
     * below exist so that can never be silent again.
     */
    const [rows, hidden] = await Promise.all([listLeads(query), countTestLeads(query)])
    leads = rows
    testCount = hidden
  } catch (err) {
    leadsError = true
    // Loud on purpose, no lead contents: this catch wraps only the two store
    // calls above, so whatever it caught is a connection/query failure, never
    // a row's data.
    console.error('LeadsPage: reading leads failed -- lead data is unavailable:', err)
  }

  if (leadsError) {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-[1.4rem] font-semibold tracking-tight">Leads</h1>
        </div>
        <Alert variant="destructive">
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertTitle>Lead data is unavailable.</AlertTitle>
          <AlertDescription>
            The leads store could not be reached, so no leads can be listed, filtered, or opened
            right now. Check the database connection and reload.
          </AlertDescription>
        </Alert>
      </>
    )
  }

  const unworked = leads.filter((l) => l.status !== 'booked' && l.status !== 'lost').length
  const filtersActive = query.city !== null || query.status !== null || query.formType !== null

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[1.4rem] font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-[0.85rem] text-muted-foreground">
          {leads.length} shown, {unworked} still need action.
          {!query.includeTest && testCount > 0 && (
            <>
              {' '}
              <Link
                href={filterHref(query, 'test', '1')}
                className="cursor-pointer font-semibold text-amber-700 underline"
              >
                {testCount} test {testCount === 1 ? 'row is' : 'rows are'} hidden
              </Link>
              .
            </>
          )}
        </p>
      </div>

      <div className="mb-4">
        <LeadFilters query={query} cities={cities.map((c) => ({ key: c.key, city: c.city }))} />
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={filtersActive ? SearchX : Inbox}
          title={filtersActive ? 'No leads match these filters' : 'No leads yet'}
          description={
            filtersActive
              ? 'Try widening or clearing a filter above.'
              : 'Submissions from every city’s booking and contact forms will show up here.'
          }
          action={
            filtersActive ? (
              <Link
                href={`${ADMIN_BASE}/leads`}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-[0.85rem] font-medium outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-9"
              >
                Clear filters
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>City / Form</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <LeadStatusChip status={lead.status} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {/* The row's one primary link -- name, not the whole
                       * row: ContactLine below is its own independent
                       * tel:/mailto: link in the same row, and an <a> cannot
                       * validly nest inside another <a>. */}
                      <Link
                        href={`${ADMIN_BASE}/leads/${lead.id}`}
                        className="inline-flex min-h-11 cursor-pointer items-center rounded-sm font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0"
                      >
                        {lead.name ?? 'No name given'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-1 text-[0.8rem] text-muted-foreground">
                        <Pill>{cityDisplayName(cityLookup, lead.cityKey)}</Pill>
                        <Pill>{lead.formType.toUpperCase()}</Pill>
                        {lead.isTest && <Pill>TEST</Pill>}
                        {lead.emailStatus === 'failed' && (
                          <Badge variant="danger" className="text-[0.65rem]">
                            email not sent
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-[0.85rem]">
                      <ContactLine lead={lead} />
                    </TableCell>
                    <TableCell className="text-[0.75rem] whitespace-nowrap text-muted-foreground">
                      {relative(lead.submittedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {leads.map((lead) => (
              <div key={lead.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  {/* Not the whole card: ContactLine below is its own
                   * independent tel:/mailto: <a> in the same card, and an
                   * <a> cannot validly nest inside another <a>. */}
                  <Link
                    href={`${ADMIN_BASE}/leads/${lead.id}`}
                    className="inline-flex min-h-11 cursor-pointer items-center font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {lead.name ?? 'No name given'}
                  </Link>
                  <LeadStatusChip status={lead.status} />
                </div>
                <div className="flex flex-wrap items-center gap-1 text-[0.8rem] text-muted-foreground">
                  <Pill>{cityDisplayName(cityLookup, lead.cityKey)}</Pill>
                  <Pill>{lead.formType.toUpperCase()}</Pill>
                  {lead.isTest && <Pill>TEST</Pill>}
                </div>
                <div className="flex items-center justify-between gap-2 text-[0.85rem]">
                  <ContactLine lead={lead} />
                  <span className="text-[0.75rem] whitespace-nowrap text-muted-foreground">
                    {relative(lead.submittedAt)}
                  </span>
                </div>
                {lead.emailStatus === 'failed' && (
                  <Badge variant="danger" className="w-fit text-[0.65rem]">
                    email not sent
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
