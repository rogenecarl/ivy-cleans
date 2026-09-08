// src/app/admin/dashboard-logic.ts
// The dashboard's presentation decisions as pure functions, testable without the framework.
import type { Role } from '@/lib/access'
import { ADMIN_BASE, ADMIN_LEADS } from '@/lib/admin-routes'

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

// live cities with no notification address — the worst silent failure. Drafts exempt.
export function sitesWithNoInbox(
  cities: { key: string; city: string; status: string }[],
  notifyEmailsByCity: Record<string, { notifyEmails: string[] }>,
): { key: string; city: string }[] {
  return cities
    .filter((c) => c.status === 'live')
    .filter((c) => (notifyEmailsByCity[c.key]?.notifyEmails.length ?? 0) === 0)
    .map((c) => ({ key: c.key, city: c.city }))
}

/** One thing that is actually wrong right now. */
export type Alarm = {
  key: 'waiting' | 'email' | 'inbox'
  label: string
  value: number
  hint: string
}

// only the FAILING checks, in fixed order: leads waiting, notifications failed, sites that can never notify
export function activeAlarms(
  args: {
    waiting: number
    oldestWaitingAt: Date | null
    emailFailed: number
    noInbox: { key: string; city: string }[]
  },
  now: Date,
): Alarm[] {
  const alarms: Alarm[] = []
  if (args.waiting > 0) {
    alarms.push({
      key: 'waiting',
      label: args.waiting === 1 ? 'Lead waiting for a reply' : 'Leads waiting for a reply',
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
  if (args.noInbox.length > 0) {
    alarms.push({
      key: 'inbox',
      label: 'Live sites with no inbox',
      value: args.noInbox.length,
      hint: args.noInbox.map((s) => s.city).join(', '),
    })
  }
  return alarms
}

// drop the alarms a role can't act on (the inbox alarm links to Sites, which a manager can't reach)
export function visibleAlarms(alarms: Alarm[], role: Role): Alarm[] {
  if (role === 'admin') return alarms
  return alarms.filter((a) => a.key !== 'inbox')
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
