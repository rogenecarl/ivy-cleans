// src/app/admin-x7kq92mpfw4rt8vz/dashboard-logic.ts
/*
 * The dashboard's presentation decisions, as pure functions.
 *
 * Split out of page.tsx for the same reason leads/logic.ts is: these are the
 * parts that can be wrong in a way nobody notices -- an age that rounds a
 * four-day-old lead down to "0 d", an alarm that fails to fire, a top-city
 * tile that flickers between two tied cities -- and they are only testable
 * at all with the framework out of scope.
 */

/**
 * How long a lead has been waiting, in the shortest form that is still
 * honest: "just now", "6 min", "4 hr", "3 d".
 *
 * ROUNDS DOWN, unlike the leads list's relative(), which rounds to nearest.
 * "3 d" must never appear over a lead that has waited two and a half days --
 * this figure exists to make an aging lead look BAD, so overstating it would
 * be as wrong as understating it, and rounding up an hour to "2 hr" reads as
 * neglect that has not happened yet.
 */
export function describeAge(from: Date, now: Date): string {
  const mins = Math.floor((now.getTime() - from.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr`
  return `${Math.floor(hours / 24)} d`
}

/**
 * This week against last, as a short phrase.
 *
 * Says "no change" rather than "0%" when they match, and names the previous
 * figure in every case: a bare arrow tells the operator a direction but not
 * whether it moved by one lead or twenty.
 */
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

/**
 * The city producing the most leads, for the "Top city" tile.
 *
 * Ties break on the city key so the tile does not flicker between two equal
 * cities on consecutive renders. Returns null for no leads at all rather
 * than an arbitrary city with zero.
 */
export function topCity(byCity: Record<string, number>): { key: string; count: number } | null {
  const entries = Object.entries(byCity).filter(([, count]) => count > 0)
  if (entries.length === 0) return null
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return { key: entries[0][0], count: entries[0][1] }
}

/**
 * Live cities with no notification address configured.
 *
 * The worst silent failure this system has: the site is public, the form
 * accepts submissions, every lead is stored -- and no human is ever told.
 * Draft cities are exempt, matching siteReadiness(): they have not launched,
 * so there is nothing to miss yet.
 */
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

/**
 * Only the checks that are FAILING, never the ones that pass.
 *
 * The dashboard used to render all three as permanent tiles, so a healthy day
 * spent a third of the screen saying "0, 0, 0". Returning just the failures
 * lets the page collapse the healthy case to a single line while still
 * naming every check by name there -- which is the property that matters: an
 * empty space cannot distinguish "all clear" from "that check is not running
 * any more", but a line that says what was checked can.
 *
 * Order is fixed and deliberate: leads waiting on a human first (a customer
 * is sitting there), then notifications that failed (a lead arrived and
 * nobody knows), then sites that can never notify anyone (the same failure,
 * permanently, until someone configures it).
 */
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
