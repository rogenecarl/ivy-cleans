// src/app/admin/(console)/dashboard/logic.ts
// The dashboard's presentation decisions as pure functions, testable without the framework.
import type { Role } from '@/server/auth/access'
import { ADMIN_BASE, ADMIN_LEADS } from '@/server/auth/admin-routes'
import type { SiteSummary } from '@/server/pipeline/admin-logic'

// how long a lead has waited: "just now", "6 min", "4 hr", "3 d". Rounds DOWN — this figure must never overstate.
export function describeAge(from: Date, now: Date): string {
  const mins = Math.floor((now.getTime() - from.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr`
  return `${Math.floor(hours / 24)} d`
}

// this week against last, naming the previous figure; "no change" rather than "0%"
export function describeTrend(current: number, previous: number): string {
  if (previous === 0 && current === 0) return 'none last week either'
  if (previous === 0) return 'none last week'
  if (current === previous) return `same as last week (${previous})`
  return current > previous ? `up from ${previous}` : `down from ${previous}`
}

/** 'up' | 'down' | 'flat', for choosing an icon. Separate from the phrase so
 * the wording can change without the arrow silently disagreeing with it. */
export function trendDirection(current: number, previous: number): 'up' | 'down' | 'flat' {
  if (current === previous) return 'flat'
  return current > previous ? 'up' : 'down'
}

// top city; ties break on key so the tile doesn't flicker. null for no leads.
export function topCity(byCity: Record<string, number>): { key: string; count: number } | null {
  const entries = Object.entries(byCity).filter(([, count]) => count > 0)
  if (entries.length === 0) return null
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return { key: entries[0][0], count: entries[0][1] }
}

/** One thing that is actually wrong right now. */
export type Alarm = {
  key: 'waiting' | 'email'
  label: string
  value: number
  hint: string
}

// only the FAILING checks, in fixed order: leads waiting, then notifications failed
export function activeAlarms(
  args: {
    waiting: number
    oldestWaitingAt: Date | null
    emailFailed: number
  },
  now: Date,
): Alarm[] {
  const alarms: Alarm[] = []
  if (args.waiting > 0) {
    alarms.push({
      key: 'waiting',
      label: args.waiting === 1 ? 'New lead to answer' : 'New leads to answer',
      value: args.waiting,
      // The age is the point. "3 waiting" is a queue; "3 waiting, oldest 2 d"
      // is a problem, and only the second one gets acted on.
      hint: args.oldestWaitingAt ? `oldest ${describeAge(args.oldestWaitingAt, now)}` : '',
    })
  }
  if (args.emailFailed > 0) {
    alarms.push({
      key: 'email',
      label: 'Notifications failed',
      value: args.emailFailed,
      hint: 'a lead arrived and nobody was emailed',
    })
  }
  return alarms
}

/** A tile in the dashboard's "Quick actions" row. */
export type QuickAction = {
  key: 'leads' | 'new-site'
  href: string
  title: string
  description: string
}

// quick actions this role can perform
export function quickActionsFor(role: Role): QuickAction[] {
  const actions: QuickAction[] = [
    {
      key: 'leads',
      href: ADMIN_LEADS,
      title: 'Work the leads',
      description: 'Read what each customer asked for, set a status, and keep notes.',
    },
  ]
  if (role === 'admin') {
    actions.push({
      key: 'new-site',
      href: `${ADMIN_BASE}/new`,
      title: 'Create a site',
      description: 'Generate a new city site, review the copy, then publish it.',
    })
  }
  return actions
}

// ---- Redesigned dashboard --------------------------------------------------------------------------------------

export { bucketByWeek } from '@/server/leads/weeks'

/** The four "Sites in progress" cards; a stopped run is still in progress. */
export function pipelineBuckets(sites: readonly SiteSummary[]) {
  return {
    generating: sites.filter((s) => s.stage === 'generating' || s.stage === 'stopped'),
    review: sites.filter((s) => s.stage === 'needs-review'),
    ready: sites.filter((s) => s.stage === 'ready'),
    live: sites.filter((s) => s.stage === 'live'),
  }
}

export type AttentionItem = {
  id: string
  tag: string
  text: string
  action: { label: string; href: string }
}

// one row per thing that needs a person, each with the one action that fixes it
export function attentionItems(alarms: Alarm[], sites: readonly SiteSummary[], role: Role): AttentionItem[] {
  const items: AttentionItem[] = alarms.map((alarm) => ({
    id: alarm.key,
    tag: 'Lead',
    text: [alarm.label, alarm.hint].filter(Boolean).join(' · '),
    action:
      alarm.key === 'waiting'
        ? { label: 'Open leads', href: `${ADMIN_LEADS}?status=new` }
        : { label: 'Open leads', href: ADMIN_LEADS },
  }))
  if (role !== 'admin') return items
  for (const site of sites) {
    if (site.stage !== 'needs-review' && site.stage !== 'ready') continue
    if (site.undecided > 0) {
      items.push({
        id: `facts:${site.key}`,
        tag: 'Site',
        text: `${site.city}: ${site.undecided === 1 ? '1 fact needs' : `${site.undecided} facts need`} your decision before writing`,
        action: { label: 'Decide', href: `${ADMIN_BASE}/generate/${site.key}` },
      })
    }
    if (!site.hasAddress) {
      items.push({
        id: `address:${site.key}`,
        tag: 'Site',
        text: `${site.city} can’t go live yet: no street address`,
        action: { label: 'Add address', href: `${ADMIN_BASE}/sites/${site.key}` },
      })
    }
  }
  return items.sort((a, b) => order(a.id) - order(b.id))
}

// alarms first, then addresses, then facts — the order the operator tends to fix them in
function order(id: string): number {
  if (id.startsWith('address:')) return 1
  if (id.startsWith('facts:')) return 2
  return 0
}
