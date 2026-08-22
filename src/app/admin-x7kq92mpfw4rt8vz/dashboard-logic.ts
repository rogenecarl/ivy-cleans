// src/app/admin-x7kq92mpfw4rt8vz/dashboard-logic.ts
/*
 * The dashboard's presentation decisions, as pure functions.
 *
 * Split out of page.tsx for the same reason leads/logic.ts is: these are the
 * parts that can be wrong in a way nobody notices -- a win rate that divides
 * by the wrong denominator, an age that rounds a four-day-old lead to "0d" --
 * and they are only testable at all with the framework out of scope.
 */

/**
 * A win rate, with the denominator it was computed from.
 *
 * DECIDED leads only (booked + lost), never the whole pipeline: dividing by
 * every lead ever received would drag the rate down with leads that simply
 * have not been worked yet, and would fall every time a new enquiry arrived --
 * a number that drops when business improves is worse than no number.
 *
 * Returns null when nothing has been decided yet. The caller renders a dash
 * rather than "0%", because zero-of-zero is not a nought-percent win rate,
 * it is an absence of evidence.
 */
export function winRate(booked: number, lost: number): { pct: number; decided: number } | null {
  const decided = booked + lost
  if (decided === 0) return null
  return { pct: Math.round((booked / decided) * 100), decided }
}

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
