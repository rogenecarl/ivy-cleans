import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Clock,
  Inbox,
  MailWarning,
  MapPin,
  CheckCircle2,
  ClipboardList,
  Plus,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'
import { listCities } from '@/pipeline/admin-logic'
import { getSiteSettingsMany, leadDashboardStats, listLeads } from '@/leads/store'
import type { LeadDashboardStats, LeadRecord, SiteSettingsRecord } from '@/leads/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ADMIN_LEADS, ADMIN_SITES } from '@/lib/admin-routes'
import { EmptyState, LeadStatusChip, StatPill } from '../../ui'
import { buildCityLookup, cityDisplayName, filterHref } from '../leads/logic'
import {
  activeAlarms,
  describeTrend,
  quickActionsFor,
  sitesWithNoInbox,
  topCity,
  trendDirection,
  visibleAlarms,
} from '../../dashboard-logic'
import { requireSession } from '@/lib/auth-server'

// Two tiers: "Needs attention" (alarms, tinted only when non-zero) and "Performance" (the weekly read).
// Nothing is edited here. force-dynamic: every figure changes with each submission.
export const dynamic = 'force-dynamic'

/** Which icon each alarm gets. A lookup, not a branch in the JSX, so adding
 * an alarm in dashboard-logic.ts fails to compile until it has one. */
const ALARM_ICON = { waiting: Clock, email: MailWarning, inbox: MapPin } as const

const RECENT_LIMIT = 6

/** An unfiltered LeadQuery, as the base for building filter links from this
 * screen -- the dashboard has no filters of its own to preserve. */
const EMPTY_QUERY = { city: null, status: null, formType: null, includeTest: false } as const

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
  // own guard: layouts don't re-render on soft navigation; React.cache makes it free
  const { role } = await requireSession()
  const isAdmin = role === 'admin'

  // one clock for the whole render
  const now = new Date()

  const cities = await listCities()
  const cityLookup = buildCityLookup(cities)

  // lead data is an enhancement: the city counts must survive a Postgres outage. Scoped to these calls only.
  // settings is inside because the no-inbox alarm is a lead-side fact; skipped for managers who can't reach Sites.
  let stats: LeadDashboardStats | null = null
  let recent: LeadRecord[] = []
  let settings: Record<string, SiteSettingsRecord> = {}
  let leadsUnavailable = false
  try {
    ;[stats, recent, settings] = await Promise.all([
      leadDashboardStats(now),
      listLeads({ city: null, status: null, formType: null, includeTest: false }),
      isAdmin ? getSiteSettingsMany(cities.map((c) => c.key)) : Promise.resolve({}),
    ])
  } catch (err) {
    leadsUnavailable = true
    // Loud on purpose, and safe to log in full: this catch wraps only the
    // three store calls, none of which returns anything resembling PII.
    console.error('AdminDashboard: lead data unavailable:', err)
  }

  const noInbox = leadsUnavailable || !isAdmin ? [] : sitesWithNoInbox(cities, settings)
  const alarms = stats
    ? visibleAlarms(
        activeAlarms(
          {
            waiting: stats.waiting,
            oldestWaitingAt: stats.oldestWaitingAt,
            emailFailed: stats.emailFailed,
            noInbox,
          },
          now,
        ),
        role,
      )
    : []
  const top = stats ? topCity(stats.byCity) : null
  const live = cities.filter((c) => c.status === 'live').length

  return (
    <>
      <div className="mb-8">
        <h1 className="text-[1.5rem] font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 max-w-2xl text-[0.9rem] text-muted-foreground">
          {isAdmin
            ? `${live === 1 ? '1 live city site' : `${live} live city sites`} and every lead they bring in. Anything needing a reply shows up first.`
            : 'Every lead across all city sites. Anything needing a reply shows up first.'}
        </p>
      </div>

      {leadsUnavailable ? (
        <Alert variant="destructive" className="mb-8">
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertTitle>Lead data is unavailable.</AlertTitle>
          <AlertDescription>
            The leads store could not be reached, so no lead figures can be shown and no site can
            be checked for a missing inbox. Do not read this as “nothing needs attention”. The
            city sites themselves are unaffected. Check the database connection and reload.
          </AlertDescription>
        </Alert>
      ) : (
        stats && (
          <>
            <section className="mb-8">
              {/* every check passes -> one line naming each check that ran (never one a manager's render didn't evaluate) */}
              {alarms.length === 0 ? (
                <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <p className="text-[0.85rem] text-emerald-900">
                    <strong className="font-semibold">All clear.</strong>{' '}
                    {isAdmin
                      ? 'Nothing waiting for a reply, every notification delivered, and every live site notifies someone.'
                      : 'Nothing waiting for a reply and every notification delivered.'}
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="mb-3 text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
                    Needs attention
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {alarms.map((alarm) => {
                      const tile = (
                        <StatPill
                          icon={ALARM_ICON[alarm.key]}
                          label={alarm.label}
                          value={alarm.value}
                          tone="alarm"
                          hint={alarm.hint}
                        />
                      )
                      // the failed-notification alarm has nowhere to link
                      const href =
                        alarm.key === 'waiting'
                          ? filterHref(EMPTY_QUERY, 'status', 'new')
                          : alarm.key === 'inbox'
                            ? ADMIN_SITES
                            : null
                      return href ? (
                        <Link
                          key={alarm.key}
                          href={href}
                          className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          {tile}
                        </Link>
                      ) : (
                        <div key={alarm.key}>{tile}</div>
                      )
                    })}
                  </div>
                </>
              )}
            </section>

            <section className="mb-8">
              <h2 className="mb-3 text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
                Performance
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatPill
                  icon={
                    trendDirection(stats.newThisWeek, stats.newLastWeek) === 'down'
                      ? TrendingDown
                      : TrendingUp
                  }
                  label="New this week"
                  value={stats.newThisWeek}
                  hint={describeTrend(stats.newThisWeek, stats.newLastWeek)}
                />
                <StatPill
                  icon={CalendarCheck}
                  label="Booked, last 30 days"
                  value={stats.bookedLast30}
                  hint={`${stats.booked} booked all time`}
                />
                {/* form split instead of a win rate: readable from the first lead */}
                <StatPill
                  icon={ClipboardList}
                  label="Booking requests"
                  value={stats.bookings}
                  hint={stats.enquiries === 1 ? '1 enquiry' : `${stats.enquiries} enquiries`}
                />
                <StatPill
                  icon={MapPin}
                  label="Top city"
                  value={top ? cityDisplayName(cityLookup, top.key) : '—'}
                  hint={top ? `${top.count} leads` : 'no leads yet'}
                />
              </div>
            </section>
          </>
        )
      )}

      {!leadsUnavailable && (
        <section className="mb-8">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
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
                {recent.slice(0, RECENT_LIMIT).map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`${ADMIN_LEADS}/${lead.id}`}
                      className="flex cursor-pointer items-center gap-3 px-6 py-3 outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
          {quickActionsFor(role).map((action) => (
            <QuickAction
              key={action.key}
              href={action.href}
              icon={action.key === 'leads' ? <Inbox className="size-4" /> : <Plus className="size-4" />}
              title={action.title}
              description={action.description}
            />
          ))}
        </div>
      </section>
    </>
  )
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
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
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.9rem] font-medium">{title}</span>
        <span className="block text-[0.8rem] text-muted-foreground">{description}</span>
      </span>
      <ArrowUpRight
        className="ml-auto size-4 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  )
}
