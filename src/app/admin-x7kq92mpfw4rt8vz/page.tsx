import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Clock,
  Inbox,
  MailWarning,
  MapPin,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'
import { listCities } from '@/pipeline/admin-logic'
import { getSiteSettingsMany, leadDashboardStats, listLeads } from '@/leads/store'
import type { LeadDashboardStats, LeadRecord, SiteSettingsRecord } from '@/leads/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ADMIN_BASE, ADMIN_LEADS, ADMIN_SITES } from './base'
import { EmptyState, LeadStatusChip, StatPill } from './ui'
import { buildCityLookup, cityDisplayName, filterHref } from './leads/logic'
import {
  describeAge,
  describeTrend,
  sitesWithNoInbox,
  topCity,
  trendDirection,
  winRate,
} from './dashboard-logic'

/*
 * The console's landing screen, in two tiers.
 *
 * TIER 1 ("Needs attention") is an alarm panel: leads nobody has replied to,
 * notifications that failed to send, and live sites with no inbox at all. It
 * is meant to be BORING -- all zeros on a healthy day -- so that any colour on
 * it means something genuinely needs doing. Tiles here are only tinted when
 * their number is non-zero; a permanently red dashboard is one nobody reads.
 *
 * TIER 2 ("Performance") is the weekly read, not the hourly one: volume
 * against last week, bookings, win rate, and which city site is actually
 * producing. Kept visually quieter than tier 1 on purpose.
 *
 * Everything is a summary; nothing is edited here. A dashboard that grows its
 * own editing controls becomes a third place the same bug has to be fixed.
 *
 * force-dynamic because every figure changes whenever a customer submits or
 * the operator moves a lead.
 */
export const dynamic = 'force-dynamic'

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
  /*
   * One clock for the whole render. Calling new Date() inside each helper
   * would let the "oldest waiting" age and the week boundaries disagree by a
   * few milliseconds -- harmless here, but the kind of drift that makes a
   * figure impossible to reproduce when someone questions it.
   */
  const now = new Date()

  const cities = await listCities()
  const cityLookup = buildCityLookup(cities)

  /*
   * Lead data is an ENHANCEMENT to this screen, not a prerequisite. The city
   * counts come off disk/Blob via listCities() above and have nothing to do
   * with Postgres, so they must keep working through a Neon outage or on a
   * fresh clone with no DATABASE_URL. Scoped to exactly these calls, not the
   * JSX below: a genuine rendering bug must still throw rather than get
   * swallowed into a friendly banner.
   *
   * settings is in here too because the no-inbox alarm is a LEAD-side fact:
   * with it unavailable we must show nothing rather than compute the alarm
   * from an empty map, which would flag every live city as having no inbox.
   */
  let stats: LeadDashboardStats | null = null
  let recent: LeadRecord[] = []
  let settings: Record<string, SiteSettingsRecord> = {}
  let leadsUnavailable = false
  try {
    ;[stats, recent, settings] = await Promise.all([
      leadDashboardStats(now),
      listLeads({ city: null, status: null, formType: null, includeTest: false }),
      getSiteSettingsMany(cities.map((c) => c.key)),
    ])
  } catch (err) {
    leadsUnavailable = true
    // Loud on purpose, and safe to log in full: this catch wraps only the
    // three store calls, none of which returns anything resembling PII.
    console.error('AdminDashboard: lead data unavailable:', err)
  }

  const noInbox = leadsUnavailable ? [] : sitesWithNoInbox(cities, settings)
  const rate = stats ? winRate(stats.booked, stats.lost) : null
  const top = stats ? topCity(stats.byCity) : null
  const live = cities.filter((c) => c.status === 'live').length

  return (
    <>
      <div className="mb-8">
        <h1 className="text-[1.5rem] font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 max-w-2xl text-[0.9rem] text-muted-foreground">
          {live === 1 ? '1 live city site' : `${live} live city sites`} and every lead they bring
          in. Anything needing a reply shows up first.
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
              <h2 className="mb-3 text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
                Needs attention
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {/* Straight through to the leads that need answering, already
                  * filtered -- the tile states a problem, so it should also
                  * be the way to start fixing it. */}
                <Link
                  href={filterHref(EMPTY_QUERY, 'status', 'new')}
                  className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <StatPill
                    icon={Clock}
                    label="Waiting for a reply"
                    value={stats.waiting}
                    tone={stats.waiting > 0 ? 'alarm' : 'good'}
                    hint={
                      stats.oldestWaitingAt
                        ? `oldest ${describeAge(stats.oldestWaitingAt, now)}`
                        : 'everyone has been answered'
                    }
                  />
                </Link>
                <StatPill
                  icon={MailWarning}
                  label="Notifications failed"
                  value={stats.emailFailed}
                  tone={stats.emailFailed > 0 ? 'alarm' : 'good'}
                  hint={
                    stats.emailFailed > 0
                      ? 'a lead arrived and nobody was emailed'
                      : 'all delivered'
                  }
                />
                <Link href={ADMIN_SITES} className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                  <StatPill
                    icon={MapPin}
                    label="Live sites with no inbox"
                    value={noInbox.length}
                    tone={noInbox.length > 0 ? 'alarm' : 'good'}
                    hint={
                      noInbox.length > 0
                        ? noInbox.map((s) => s.city).join(', ')
                        : 'every live site notifies someone'
                    }
                  />
                </Link>
              </div>
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
                <StatPill
                  icon={Target}
                  label="Win rate"
                  // A dash, not "0%": with nothing decided yet there is no
                  // rate to report, and 0% would read as "we lose everything".
                  value={rate ? `${rate.pct}%` : '—'}
                  hint={
                    rate
                      ? `${stats.booked} of ${rate.decided} decided`
                      : 'no leads decided yet'
                  }
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
                {recent.slice(0, RECENT_LIMIT).map((lead) => (
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
            icon={<Inbox className="size-4" />}
            title="Work the leads"
            description="Read what each customer asked for, set a status, and keep notes."
          />
          <QuickAction
            href={`${ADMIN_BASE}/new`}
            icon={<Plus className="size-4" />}
            title="Add a city"
            description="Generate a new city site, review the copy, then publish it."
          />
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
