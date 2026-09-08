import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import { listCities } from '@/pipeline/admin-logic'
import { parseLeadQuery } from '@/leads/filters'
import { countTestLeads, leadStatusCounts, listLeads } from '@/leads/store'
import type { LeadRecord, LeadStatusCounts } from '@/leads/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { buildCityLookup, cityDisplayName, filterHref } from './logic'
import { LeadFilters } from './lead-filters'
import { LeadsTable, type LeadRow } from './leads-table'
import { StatusChips } from './status-chips'
import { requireSession } from '@/lib/auth-server'

// force-dynamic: the list changes with every submission
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
  // own guard: this screen reads customer PII
  await requireSession()

  const params = await searchParams
  const query = parseLeadQuery(params)
  const cities = await listCities()
  const cityLookup = buildCityLookup(cities)

  // no useful content without the store, so this fails legibly rather than degrading
  let leads: LeadRecord[] = []
  let testCount = 0
  let statusCounts: LeadStatusCounts = { new: 0, contacted: 0, quoted: 0, booked: 0, lost: 0 }
  let leadsError = false
  try {
    // the test-row count is in the same try: hidden rows must never be silent
    const [rows, hidden, byStatus] = await Promise.all([
      listLeads(query),
      countTestLeads(query),
      leadStatusCounts(query),
    ])
    leads = rows
    testCount = hidden
    statusCounts = byStatus
  } catch (err) {
    leadsError = true
    // loud, no lead contents: this catch only wraps the two store calls
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

  // view-model for the client table; time strings built here on the server to avoid a hydration mismatch
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

      {/* the pipeline doubles as the status filter (status-chips.tsx) */}
      <div className="mb-4">
        <StatusChips query={query} counts={statusCounts} />
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
