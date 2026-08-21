import Link from 'next/link'
import { listCities } from '@/pipeline/admin-logic'
import { parseLeadQuery } from '@/leads/filters'
import { countTestLeads, listLeads } from '@/leads/store'
import { LEAD_STATUSES, type LeadRecord } from '@/leads/types'
import { ADMIN_BASE } from '../base'
import { LeadStatusChip, Pill } from '../ui'
import { buildCityLookup, cityDisplayName, filterHref } from './logic'

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
        <div
          role="alert"
          className="rounded-lg border border-[#f3b4b4] bg-[#fdecec] px-4 py-6 text-[0.9rem] text-[#7a1414]"
        >
          <p className="font-semibold">Lead data is unavailable.</p>
          <p className="mt-1 text-[0.85rem]">
            The leads store could not be reached, so no leads can be listed, filtered, or opened
            right now. Check the database connection and reload.
          </p>
        </div>
      </>
    )
  }

  const unworked = leads.filter((l) => l.status !== 'booked' && l.status !== 'lost').length

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[1.4rem] font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-[0.85rem] text-[#6b7680]">
          {leads.length} shown, {unworked} still need action.
          {!query.includeTest && testCount > 0 && (
            <>
              {' '}
              <Link
                href={filterHref(query, 'test', '1')}
                className="font-semibold text-[#8a5300] underline"
              >
                {testCount} test {testCount === 1 ? 'row is' : 'rows are'} hidden
              </Link>
              .
            </>
          )}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[0.8rem]">
        <FilterGroup
          label="City"
          current={query.city}
          options={cities.map((c) => ({ value: c.key, label: c.city }))}
          href={(v) => filterHref(query, 'city', v)}
        />
        <FilterGroup
          label="Status"
          current={query.status}
          options={LEAD_STATUSES.map((s) => ({ value: s, label: s }))}
          href={(v) => filterHref(query, 'status', v)}
        />
        <FilterGroup
          label="Form"
          current={query.formType}
          options={[
            { value: 'booking', label: 'booking' },
            { value: 'contact', label: 'contact' },
          ]}
          href={(v) => filterHref(query, 'form', v)}
        />
        {/*
         * The toggle spec 3.1 promised. Not a FilterGroup: this dimension has
         * two states, not "All plus some values", and calling the default
         * state "All" would read as "everything is shown" when it is exactly
         * the state that hides rows.
         */}
        <div className="flex items-center gap-1 rounded-md border border-[#d8dde2] bg-white px-2 py-1">
          <span className="text-[0.7rem] font-semibold text-[#6b7680] uppercase">Test rows</span>
          <Link
            href={filterHref(query, 'test', null)}
            className={!query.includeTest ? 'font-semibold' : 'text-[#6b7680]'}
          >
            hidden
          </Link>
          <Link
            href={filterHref(query, 'test', '1')}
            className={query.includeTest ? 'font-semibold' : 'text-[#6b7680]'}
          >
            shown
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#d8dde2] bg-white">
        {leads.length === 0 && (
          <p className="px-4 py-8 text-center text-[0.9rem] text-[#6b7680]">
            No leads match these filters.
          </p>
        )}
        {leads.map((lead) => (
          <Link
            key={lead.id}
            href={`${ADMIN_BASE}/leads/${lead.id}`}
            className="flex items-center gap-3 border-b border-[#e6eaee] px-4 py-3 last:border-b-0 hover:bg-[#f7f8f9]"
          >
            <LeadStatusChip status={lead.status} />
            <span className="min-w-[9rem] text-[0.9rem] font-medium">
              {lead.name ?? 'No name given'}
            </span>
            <span className="flex-1 truncate text-[0.8rem] text-[#6b7680]">
              <Pill>{cityDisplayName(cityLookup, lead.cityKey)}</Pill>{' '}
              <Pill>{lead.formType.toUpperCase()}</Pill>{' '}
              {/* Only reachable with the toggle on, and then it must be obvious which rows are the previews. */}
              {lead.isTest && (
                <>
                  <Pill>TEST</Pill>{' '}
                </>
              )}
              {lead.phone ?? lead.email ?? 'No contact info'}
              {lead.emailStatus === 'failed' && (
                <span className="ml-2 text-[#a11212]">email not sent</span>
              )}
            </span>
            <span className="text-[0.75rem] whitespace-nowrap text-[#8a949d]">
              {relative(lead.submittedAt)}
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}

function FilterGroup({
  label,
  current,
  options,
  href,
}: {
  label: string
  current: string | null
  options: { value: string; label: string }[]
  href: (value: string | null) => string
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-[#d8dde2] bg-white px-2 py-1">
      <span className="text-[0.7rem] font-semibold text-[#6b7680] uppercase">{label}</span>
      <Link href={href(null)} className={current === null ? 'font-semibold' : 'text-[#6b7680]'}>
        All
      </Link>
      {options.map((option) => (
        <Link
          key={option.value}
          href={href(option.value)}
          className={current === option.value ? 'font-semibold' : 'text-[#6b7680]'}
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}
