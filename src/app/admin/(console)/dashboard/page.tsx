import Link from 'next/link'
import { ArrowRight, CheckCircle2, ExternalLink, Inbox, TriangleAlert } from 'lucide-react'
import { listCities, listSiteSummaries, type SiteSummary } from '@/server/pipeline/admin-logic'
import { leadDashboardStats, leadsPerWeek, listLeads } from '@/server/leads/store'
import type { LeadDashboardStats, LeadRecord } from '@/server/leads/types'
import { loadRouting } from '@/server/content/resolve-rewrite'
import { siteLink } from '@/server/leads/readiness'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ADMIN_LEADS, ADMIN_SITES } from '@/server/auth/admin-routes'
import { EmptyState, LeadStatusChip, StagePill, initials } from '@/app/admin/_components/ui'
import { buildCityLookup, cityDisplayName } from '@/app/admin/(console)/leads/logic'
import {
  activeAlarms,
  attentionItems,
  dashboardHeadline,
  describeAge,
  describeTrend,
  pipelineBuckets,
  weekStartLabels,
} from './logic'
import { requireSession } from '@/server/auth/auth-server'
import { cn } from '@/lib/utils'

// What needs a person first, then the figures, the latest leads, the sites, and the weekly trend. Nothing is edited
// here. force-dynamic: every figure changes with each submission.
export const dynamic = 'force-dynamic'

const RECENT_LIMIT = 6
const WEEKS = 8

const EMPTY_QUERY = { city: null, status: null, formType: null } as const

const SECTION_TITLE = 'text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase'
const CARD = 'rounded-lg border border-border bg-card'

export default async function AdminDashboard() {
  // own guard: layouts don't re-render on soft navigation; React.cache makes it free
  const { role } = await requireSession()
  const isAdmin = role === 'admin'
  const now = new Date()

  const sites: SiteSummary[] = isAdmin ? await listSiteSummaries() : []
  const cityLookup = buildCityLookup(isAdmin ? sites : await listCities())
  const { domains } = await loadRouting()

  // lead data is an enhancement: the page must survive a Postgres outage. Scoped to these calls only.
  let stats: LeadDashboardStats | null = null
  let recent: LeadRecord[] = []
  let weeks: number[] = []
  let leadsUnavailable = false
  try {
    ;[stats, recent, weeks] = await Promise.all([
      leadDashboardStats(now),
      listLeads(EMPTY_QUERY, RECENT_LIMIT),
      leadsPerWeek(now, WEEKS),
    ])
  } catch (err) {
    leadsUnavailable = true
    // safe to log in full: this catch wraps only aggregate store calls, nothing resembling PII
    console.error('AdminDashboard: lead data unavailable:', err)
  }

  const alarms = stats
    ? activeAlarms({ waiting: stats.waiting, oldestWaitingAt: stats.oldestWaitingAt, emailFailed: stats.emailFailed }, now)
    : []
  const items = attentionItems(alarms, sites, role)
  const live = pipelineBuckets(sites).live.length
  const totalLeads = weeks.reduce((sum, n) => sum + n, 0)

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[1.5rem] font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-[0.95rem] text-muted-foreground" data-role="headline">
          {dashboardHeadline(stats ? stats.waiting : null)}
        </p>
      </div>

      {leadsUnavailable && (
        <Alert variant="destructive" className="mb-6">
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertTitle>Lead data is unavailable.</AlertTitle>
          <AlertDescription>
            The leads store could not be reached, so no lead figures can be shown. Do not read this as &ldquo;nothing needs
            attention&rdquo;. Check the database connection and reload.
          </AlertDescription>
        </Alert>
      )}

      <section className="mb-6" aria-labelledby="attention-title" data-role="attention">
        {items.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-amber-300/70 bg-card">
            <h2 id="attention-title" className={cn(SECTION_TITLE, 'bg-amber-50/70 px-5 py-3 text-amber-900')}>
              Needs attention
            </h2>
            <ul className="divide-y divide-border/60">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span
                    aria-hidden="true"
                    className={cn('size-2 shrink-0 rounded-full', item.tag === 'Site' ? 'bg-amber-500' : 'bg-red-500')}
                  />
                  <span className="min-w-0 flex-[999_1_260px] text-[0.9rem]">{item.text}</span>
                  <Button asChild size="sm" className="min-h-11 sm:min-h-8">
                    <Link href={item.action.href}>{item.action.label}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          !leadsUnavailable && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-5 py-3">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <p className="text-[0.9rem] text-emerald-900">
                <strong className="font-semibold">All clear.</strong> Nothing is waiting on you.
              </p>
            </div>
          )
        )}
      </section>

      {stats && (
        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key figures" data-role="figures">
          <Stat value={stats.waiting} label="New leads to answer" href={`${ADMIN_LEADS}?status=new`} alert={stats.waiting > 0} />
          <Stat value={stats.newThisWeek} label="Leads this week" note={describeTrend(stats.newThisWeek, stats.newLastWeek)} />
          <Stat value={stats.bookedLast30} label="Booked, last 30 days" note={`${stats.booked} booked in total`} />
          {isAdmin ? (
            <Stat value={live} label={live === 1 ? 'Live site' : 'Live sites'} href={ADMIN_SITES} />
          ) : (
            <Stat value={totalLeads} label={`Leads, last ${WEEKS} weeks`} />
          )}
        </section>
      )}

      <div className={cn('mb-6 grid gap-4', isAdmin && 'lg:grid-cols-3')}>
        {stats && (
          <section className={cn(CARD, 'overflow-hidden', isAdmin && 'lg:col-span-2')} aria-labelledby="recent-title">
            <SectionHeader id="recent-title" title="Recent leads" href={ADMIN_LEADS} link="View all" />
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
                      className="flex items-center gap-3 px-5 py-3 outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[0.7rem] font-semibold text-muted-foreground"
                      >
                        {initials(lead.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[0.9rem] font-medium">{lead.name ?? 'No name given'}</span>
                          <FormBadge formType={lead.formType} />
                        </span>
                        <span className="block truncate text-[0.75rem] text-muted-foreground">
                          {cityDisplayName(cityLookup, lead.cityKey)} · {describeAge(lead.submittedAt, now)} ago
                        </span>
                      </span>
                      <LeadStatusChip status={lead.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {isAdmin && (
          <section className={cn(CARD, 'overflow-hidden')} aria-labelledby="sites-title" data-role="sites">
            <SectionHeader id="sites-title" title="Sites" href={ADMIN_SITES} link="All sites" />
            {sites.length === 0 ? (
              <p className="px-5 py-4 text-[0.85rem] text-muted-foreground">No sites yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {sites.map((site) => {
                  const href = siteLink(site.key, site.stage === 'live', domains)
                  const external = href.startsWith('https://')
                  return (
                    <li key={site.key} className="flex items-center gap-3 px-5 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9rem] font-medium">{site.city}</span>
                        {site.reason && (
                          <span className="block truncate text-[0.75rem] text-muted-foreground">{site.reason}</span>
                        )}
                      </span>
                      <StagePill stage={site.stage} />
                      {external ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`View ${site.city} live site (opens in a new tab)`}
                          className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:size-8"
                        >
                          <ExternalLink className="size-4" aria-hidden="true" />
                        </a>
                      ) : (
                        <Link
                          href={site.next.href}
                          aria-label={`${site.next.label}: ${site.city}`}
                          className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:size-8"
                        >
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      {stats && <WeeklyChart weeks={weeks} labels={weekStartLabels(now, WEEKS)} />}
    </>
  )
}

function SectionHeader({ id, title, href, link }: { id: string; title: string; href: string; link: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
      <h2 id={id} className="text-[0.95rem] font-semibold">
        {title}
      </h2>
      <Link
        href={href}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-[0.85rem] font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-9"
      >
        {link}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  )
}

function Stat({
  value,
  label,
  note,
  href,
  alert = false,
}: {
  value: number
  label: string
  note?: string
  href?: string
  alert?: boolean
}) {
  const body = (
    <>
      <strong className={cn('block text-[1.9rem] leading-none font-semibold tabular-nums', alert && 'text-red-700')}>
        {value}
      </strong>
      <span className="mt-2 block text-[0.8rem] font-medium">{label}</span>
      {note && <span className="mt-0.5 block text-[0.75rem] text-muted-foreground">{note}</span>}
    </>
  )
  const box = cn(CARD, 'block p-4')
  return href ? (
    <Link
      href={href}
      className={cn(box, 'outline-none hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50')}
    >
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  )
}

function FormBadge({ formType }: { formType: LeadRecord['formType'] }) {
  const booking = formType === 'booking'
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold',
        booking ? 'bg-orange-100 text-orange-900' : 'bg-emerald-100 text-emerald-900',
      )}
    >
      {booking ? 'Booking' : 'Contact'}
    </span>
  )
}

function WeeklyChart({ weeks, labels }: { weeks: number[]; labels: string[] }) {
  const peak = Math.max(1, ...weeks)
  const total = weeks.reduce((sum, n) => sum + n, 0)
  return (
    <section className={cn(CARD, 'p-5')} aria-labelledby="trend-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="trend-title" className={SECTION_TITLE}>
          Leads per week
        </h2>
        <span className="text-[0.8rem] text-muted-foreground">
          {total} in the last {weeks.length} weeks
        </span>
      </div>
      <ol
        className="mt-4 flex h-40 items-end gap-2 sm:gap-3"
        aria-label={`Leads per week, oldest first: ${weeks.map((n, i) => `week of ${labels[i]}: ${n}`).join(', ')}`}
        data-role="lead-chart"
      >
        {weeks.map((n, i) => (
          <li key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className={cn('text-[0.75rem] tabular-nums', n > 0 ? 'font-semibold' : 'text-muted-foreground')}>{n}</span>
            <span
              aria-hidden="true"
              className={cn('w-full max-w-12 rounded-t-sm', n > 0 ? 'bg-[#40907A]' : 'bg-muted')}
              style={{ height: `${Math.max(3, Math.round((n / peak) * 100))}%` }}
            />
            <span className="mt-1 truncate text-[0.65rem] text-muted-foreground sm:text-[0.7rem]">{labels[i]}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
