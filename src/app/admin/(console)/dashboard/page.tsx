import Link from 'next/link'
import { ArrowRight, CheckCircle2, Inbox, TriangleAlert } from 'lucide-react'
import { listCities, listSiteSummaries, type SiteSummary } from '@/server/pipeline/admin-logic'
import { getSiteSettingsMany, leadDashboardStats, leadsPerWeek, listLeads } from '@/server/leads/store'
import type { LeadDashboardStats, LeadRecord, SiteSettingsRecord } from '@/server/leads/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ADMIN_LEADS, ADMIN_SITES } from '@/server/auth/admin-routes'
import { EmptyState, LeadStatusChip, initials } from '@/app/admin/_components/ui'
import { buildCityLookup, cityDisplayName } from '@/app/admin/(console)/leads/logic'
import { activeAlarms, attentionItems, describeTrend, pipelineBuckets, sitesWithNoInbox } from './logic'
import { requireSession } from '@/server/auth/auth-server'
import { cn } from '@/lib/utils'

// Sites in progress (admin), what needs a person (each with its one action), the lead trend, the latest leads.
// Nothing is edited here. force-dynamic: every figure changes with each submission.
export const dynamic = 'force-dynamic'

const RECENT_LIMIT = 6
const WEEKS = 8

const EMPTY_QUERY = { city: null, status: null, formType: null } as const

export default async function AdminDashboard() {
  // own guard: layouts don't re-render on soft navigation; React.cache makes it free
  const { role } = await requireSession()
  const isAdmin = role === 'admin'
  const now = new Date()

  const sites: SiteSummary[] = isAdmin ? await listSiteSummaries() : []
  const cityLookup = buildCityLookup(isAdmin ? sites : await listCities())

  // lead data is an enhancement: the site cards must survive a Postgres outage. Scoped to these calls only.
  let stats: LeadDashboardStats | null = null
  let recent: LeadRecord[] = []
  let weeks: number[] = []
  let settings: Record<string, SiteSettingsRecord> = {}
  let leadsUnavailable = false
  try {
    ;[stats, recent, weeks, settings] = await Promise.all([
      leadDashboardStats(now),
      listLeads(EMPTY_QUERY, RECENT_LIMIT),
      leadsPerWeek(now, WEEKS),
      isAdmin ? getSiteSettingsMany(sites.map((s) => s.key)) : Promise.resolve({}),
    ])
  } catch (err) {
    leadsUnavailable = true
    // safe to log in full: this catch wraps only aggregate store calls, nothing resembling PII
    console.error('AdminDashboard: lead data unavailable:', err)
  }

  const alarms = stats
    ? activeAlarms(
        {
          waiting: stats.waiting,
          oldestWaitingAt: stats.oldestWaitingAt,
          emailFailed: stats.emailFailed,
          noInbox: isAdmin ? sitesWithNoInbox(sites, settings) : [],
        },
        now,
      )
    : []
  const items = attentionItems(alarms, sites, role)
  const buckets = pipelineBuckets(sites)
  const inProgress = buckets.generating.length + buckets.review.length + buckets.ready.length
  const totalLeads = weeks.reduce((sum, n) => sum + n, 0)
  const peak = Math.max(1, ...weeks)

  return (
    <>
      <div className="mb-8">
        <h1 className="text-[1.5rem] font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 max-w-2xl text-[0.9rem] text-muted-foreground">
          {isAdmin
            ? `${buckets.live.length} live ${buckets.live.length === 1 ? 'site' : 'sites'}, ${inProgress} in progress${
                stats ? `, ${totalLeads} ${totalLeads === 1 ? 'lead' : 'leads'} in the last ${WEEKS} weeks` : ''
              }. Anything that needs you comes first.`
            : 'Every lead across all city sites. Anything needing a reply shows up first.'}
        </p>
      </div>

      {isAdmin && (
        <section className="mb-8" aria-labelledby="pipeline-title" data-role="pipeline">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="pipeline-title" className="text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
              Sites in progress
            </h2>
            <Link href={ADMIN_SITES} className="text-[0.85rem] font-medium hover:underline">
              All sites →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PipelineCard title="Generating" tone="blue" sites={buckets.generating} empty="Nothing is being generated." />
            <PipelineCard title="Needs your review" tone="amber" sites={buckets.review} empty="Nothing waiting on you." />
            <PipelineCard title="Ready to publish" tone="green" sites={buckets.ready} empty="Sites land here once every check passes." />
            <PipelineCard title="Live" tone="green" sites={buckets.live} empty="No live sites yet." />
          </div>
        </section>
      )}

      {leadsUnavailable && (
        <Alert variant="destructive" className="mb-8">
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertTitle>Lead data is unavailable.</AlertTitle>
          <AlertDescription>
            The leads store could not be reached, so no lead figures can be shown and no site can be checked for a
            missing inbox. Do not read this as “nothing needs attention”. Check the database connection and reload.
          </AlertDescription>
        </Alert>
      )}

      <section className="mb-8" aria-labelledby="attention-title" data-role="attention">
        {items.length === 0 && !leadsUnavailable ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <p className="text-[0.85rem] text-emerald-900">
              <strong className="font-semibold">All clear.</strong> No new leads to answer, nothing waiting on a decision, and
              every live site notifies someone.
            </p>
          </div>
        ) : (
          items.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <h2
                id="attention-title"
                className="px-5 pt-4 pb-2 text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase"
              >
                Needs attention
              </h2>
              <ul className="divide-y divide-border/60">
                {items.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold',
                        item.tag === 'Site' ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-800',
                      )}
                    >
                      {item.tag}
                    </span>
                    <span className="min-w-0 flex-[999_1_280px] text-[0.9rem]">{item.text}</span>
                    <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-8">
                      <Link href={item.action.href}>{item.action.label}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </section>

      {!leadsUnavailable && stats && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-5" aria-labelledby="trend-title">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="trend-title" className="text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
                Leads, last {WEEKS} weeks
              </h2>
              <span className="text-[0.8rem] text-muted-foreground">
                {stats.newThisWeek} this week · {describeTrend(stats.newThisWeek, stats.newLastWeek)}
              </span>
            </div>
            {totalLeads === 0 && (
              <p className="mt-3 text-[0.85rem] text-muted-foreground">No leads in the last {WEEKS} weeks.</p>
            )}
            <div
              className="mt-4 flex h-28 items-end gap-2"
              role="img"
              aria-label={`Leads per week, oldest first: ${weeks.join(', ')}`}
              data-role="lead-chart"
            >
              {weeks.map((n, i) => (
                <span
                  key={i}
                  className={cn('flex-1 rounded-sm', n > 0 ? 'bg-primary' : 'bg-muted')}
                  style={{ height: `${Math.max(4, Math.round((n / peak) * 112))}px` }}
                  title={`${n} ${n === 1 ? 'lead' : 'leads'}`}
                />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-[0.8rem] text-muted-foreground">
              <Figure value={stats.bookings} label={stats.bookings === 1 ? 'booking request' : 'booking requests'} />
              <Figure value={stats.enquiries} label={stats.enquiries === 1 ? 'enquiry' : 'enquiries'} />
              <Figure value={stats.booked} label="total booked" />
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-card" aria-labelledby="recent-title">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 id="recent-title" className="text-[0.95rem] font-semibold">
                Recent leads
              </h2>
              <Link
                href={ADMIN_LEADS}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-[0.85rem] font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-9"
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
                      className="flex items-center gap-3 px-5 py-3 outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[0.7rem] font-semibold text-muted-foreground"
                      >
                        {initials(lead.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9rem] font-medium">{lead.name ?? 'No name given'}</span>
                        <span className="block truncate text-[0.75rem] text-muted-foreground">
                          {lead.email ?? lead.phone ?? 'No contact info'} · {cityDisplayName(cityLookup, lead.cityKey)}
                        </span>
                      </span>
                      <LeadStatusChip status={lead.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  )
}

const TONE = {
  blue: 'text-blue-800',
  amber: 'text-amber-900',
  green: 'text-emerald-800',
} as const

function PipelineCard({
  title,
  tone,
  sites,
  empty,
}: {
  title: string
  tone: keyof typeof TONE
  sites: SiteSummary[]
  empty: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <span className={cn('text-[0.7rem] font-semibold tracking-wider uppercase', TONE[tone])}>
        {title} · {sites.length}
      </span>
      {sites.length === 0 ? (
        <span className="text-[0.8rem] text-muted-foreground">{empty}</span>
      ) : (
        <ul className="flex flex-col gap-2">
          {sites.map((site) => (
            <li key={site.key}>
              <Link
                href={site.next.href}
                className="block rounded-md outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span className="block text-[0.95rem] font-semibold">{site.city}</span>
                {site.stage === 'generating' || site.stage === 'stopped' ? (
                  <>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <span
                        className={cn('block h-full rounded-full', site.stage === 'stopped' ? 'bg-destructive' : 'bg-primary')}
                        style={{ width: `${Math.round(((site.doneCount ?? 0) / site.totalStages) * 100)}%` }}
                      />
                    </span>
                    <span className="mt-1 block text-[0.75rem] text-muted-foreground">
                      {site.stage === 'stopped' ? 'Stopped — resume it' : `${site.doneCount ?? 0} of ${site.totalStages} stages`}
                    </span>
                  </>
                ) : (
                  <span className="block text-[0.75rem] text-muted-foreground">{site.reason ?? site.next.label}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <strong className="block text-[1.3rem] font-semibold text-foreground tabular-nums">{value}</strong>
      {label}
    </div>
  )
}
