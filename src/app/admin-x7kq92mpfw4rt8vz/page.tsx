import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CircleDashed,
  Globe2,
  Inbox,
  PhoneCall,
  Plus,
  TriangleAlert,
} from 'lucide-react'
import { listCities } from '@/pipeline/admin-logic'
import { listLeads } from '@/leads/store'
import type { LeadRecord } from '@/leads/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ADMIN_BASE, ADMIN_LEADS, ADMIN_SITES } from './base'
import { EmptyState, LeadStatusChip, StatPill } from './ui'
import { buildCityLookup, cityDisplayName } from './leads/logic'

/*
 * The console's landing screen, laid out after peaktransport's admin
 * dashboard: grouped counts, then a recent-activity list with a "View all",
 * then the two things an operator actually comes here to start.
 *
 * It owns no data of its own -- everything here is a summary of the Sites and
 * Leads screens, which remain the places to actually work. Deliberately so: a
 * dashboard that grows its own editing controls becomes a third place where
 * the same bug has to be fixed.
 *
 * force-dynamic for the same reason the other two screens use it: these counts
 * change whenever a customer submits or the operator does anything, and a
 * cached dashboard would show a city as GENERATING after it went live.
 */
export const dynamic = 'force-dynamic'

/** How many leads the recent list shows before deferring to the Leads screen. */
const RECENT_LIMIT = 6

function initials(name: string | null): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export default async function AdminDashboard() {
  const cities = await listCities()
  const cityLookup = buildCityLookup(cities)

  /*
   * Lead data is an ENHANCEMENT to this screen, not a prerequisite. The city
   * counts come off disk/Blob via listCities() above and have nothing to do
   * with Postgres, so they must keep working through a Neon outage or on a
   * fresh clone with no DATABASE_URL. Scoped to exactly this call, not the
   * JSX below: a genuine rendering bug must still throw rather than get
   * swallowed into a friendly banner.
   */
  let leads: LeadRecord[] = []
  let leadsUnavailable = false
  try {
    leads = await listLeads({ city: null, status: null, formType: null, includeTest: false })
  } catch (err) {
    leadsUnavailable = true
    // Loud on purpose, and safe to log in full: this catch wraps only the
    // listLeads call, so whatever it caught is a connection/query failure,
    // never a row's PII.
    console.error('AdminDashboard: listLeads failed -- lead summary unavailable:', err)
  }

  const countOf = (status: LeadRecord['status']) => leads.filter((l) => l.status === status).length
  const unworked = leads.filter((l) => l.status !== 'booked' && l.status !== 'lost').length
  const live = cities.filter((c) => c.status === 'live').length
  const drafts = cities.filter((c) => c.status !== 'live').length
  const recent = leads.slice(0, RECENT_LIMIT)

  return (
    <>
      <div className="mb-8">
        <h1 className="text-[1.5rem] font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 max-w-2xl text-[0.9rem] text-muted-foreground">
          Every city site and every lead they bring in, in one place. Add a city, review what the
          generator wrote, and work the booking and contact enquiries as they arrive.
        </p>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
            City sites
          </h2>
          <Link
            href={ADMIN_SITES}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm text-[0.85rem] font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-9"
          >
            View all
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatPill icon={Building2} label="Total sites" value={cities.length} />
          <StatPill icon={Globe2} label="Live" value={live} />
          <StatPill icon={CircleDashed} label="Not live yet" value={drafts} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
          Leads
        </h2>
        {leadsUnavailable ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" aria-hidden="true" />
            <AlertTitle>Lead data is unavailable.</AlertTitle>
            <AlertDescription>
              The leads store could not be reached, so no lead counts can be shown. The city sites
              above are unaffected. Check the database connection and reload.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatPill icon={Inbox} label="Total leads" value={leads.length} />
            <StatPill
              icon={CircleDashed}
              label="Need action"
              value={unworked}
              emphasis={unworked > 0}
            />
            <StatPill icon={Inbox} label="New" value={countOf('new')} />
            <StatPill icon={PhoneCall} label="Contacted" value={countOf('contacted')} />
            <StatPill icon={CalendarCheck} label="Booked" value={countOf('booked')} />
          </div>
        )}
      </section>

      {!leadsUnavailable && (
        <section className="mb-8">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-[0.95rem] font-semibold">Recent leads</h2>
                <p className="text-[0.8rem] text-muted-foreground">
                  The latest booking and contact submissions across every city.
                </p>
              </div>
              <Link
                href={ADMIN_LEADS}
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm text-[0.85rem] font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-9"
              >
                View all
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Inbox}
                  title="No leads yet"
                  description="Submissions from every city’s booking and contact forms will show up here."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`${ADMIN_LEADS}/${lead.id}`}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[0.7rem] font-semibold text-muted-foreground"
                      >
                        {initials(lead.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9rem] font-medium">
                          {lead.name ?? 'No name given'}
                        </span>
                        <span className="block truncate text-[0.75rem] text-muted-foreground">
                          {lead.email ?? lead.phone ?? 'No contact info'} ·{' '}
                          {cityDisplayName(cityLookup, lead.cityKey)}
                        </span>
                      </span>
                      <LeadStatusChip status={lead.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickAction
            href={ADMIN_LEADS}
            title="Work the leads"
            description="Read what each customer asked for, set a status, and keep notes."
          />
          <QuickAction
            href={`${ADMIN_BASE}/new`}
            title="Add a city"
            description="Generate a new city site, review the copy, then publish it."
            icon
          />
        </div>
      </section>
    </>
  )
}

function QuickAction({
  href,
  title,
  description,
  icon,
}: {
  href: string
  title: string
  description: string
  icon?: boolean
}) {
  return (
    <Link
      href={href}
      className="group flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
      >
        {icon ? <Plus className="size-4" /> : <Inbox className="size-4" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.9rem] font-medium">{title}</span>
        <span className="block text-[0.8rem] text-muted-foreground">{description}</span>
      </span>
      <ArrowRight
        className="ml-auto size-4 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  )
}
