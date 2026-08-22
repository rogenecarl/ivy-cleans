import Link from 'next/link'
import {
  CalendarCheck,
  CircleDashed,
  FileText,
  Inbox,
  PhoneCall,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import { listCities } from '@/pipeline/admin-logic'
import { parseLeadQuery } from '@/leads/filters'
import { countTestLeads, listLeads } from '@/leads/store'
import type { LeadRecord } from '@/leads/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { StatPill } from '../ui'
import { buildCityLookup, cityDisplayName, filterHref } from './logic'
import { LeadFilters } from './lead-filters'
import { LeadsTable, type LeadRow } from './leads-table'

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
  const countOf = (status: LeadRecord['status']) => leads.filter((l) => l.status === status).length

  /*
   * The view-model the client table renders. Both time strings are built
   * HERE, on the server, because leads-table.tsx is a client component and
   * anything derived from Date.now()/toLocaleString() would otherwise be
   * computed twice against a different clock and timezone -- a guaranteed
   * hydration mismatch. See the header of leads-table.tsx.
   */
  const rows: LeadRow[] = leads.map((lead) => ({
    lead,
    cityName: cityDisplayName(cityLookup, lead.cityKey),
    submittedLabel: relative(lead.submittedAt),
    submittedExact: lead.submittedAt.toLocaleString(),
  }))

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

      {/* Counts describe what the current filters return, not the whole
        * database -- otherwise the numbers would contradict the table
        * directly beneath them the moment a filter was applied. */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatPill icon={FileText} label="Shown" value={leads.length} />
        <StatPill icon={CircleDashed} label="Need action" value={unworked} emphasis={unworked > 0} />
        <StatPill icon={Inbox} label="New" value={countOf('new')} />
        <StatPill icon={PhoneCall} label="Contacted" value={countOf('contacted')} />
        <StatPill icon={CalendarCheck} label="Booked" value={countOf('booked')} />
        <StatPill icon={XCircle} label="Lost" value={countOf('lost')} />
      </div>

      <LeadsTable
        rows={rows}
        filtersActive={filtersActive}
        filters={
          <LeadFilters query={query} cities={cities.map((c) => ({ key: c.key, city: c.city }))} />
        }
      />
    </>
  )
}
