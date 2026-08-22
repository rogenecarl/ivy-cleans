/*
 * The dashboard's numbers, as a test.
 *
 * These exist because every function here can be wrong in a way that still
 * renders perfectly: a win rate over the wrong denominator, an age that
 * rounds a two-day-old lead up to "3 d", a top city that flips between two
 * equal cities on consecutive renders. None of that throws, none of it looks
 * broken, and all of it would be quoted back as fact.
 */
import { describe, expect, it } from 'vitest'
import {
  describeAge,
  describeTrend,
  sitesWithNoInbox,
  topCity,
  trendDirection,
  winRate,
} from '@/app/admin-x7kq92mpfw4rt8vz/dashboard-logic'

describe('winRate', () => {
  it('divides by DECIDED leads, not by every lead ever received', () => {
    // 4 booked, 3 lost, and any number still in the pipeline. The rate must
    // not move when an undecided lead arrives.
    expect(winRate(4, 3)).toEqual({ pct: 57, decided: 7 })
  })

  it('is null rather than 0% when nothing has been decided', () => {
    // 0% would read as "we lose everything"; the truth is "we do not know".
    expect(winRate(0, 0)).toBeNull()
  })

  it('reports 100% and 0% honestly once there is evidence', () => {
    expect(winRate(3, 0)).toEqual({ pct: 100, decided: 3 })
    expect(winRate(0, 2)).toEqual({ pct: 0, decided: 2 })
  })
})

describe('describeAge', () => {
  const now = new Date('2026-08-22T12:00:00Z')
  const ago = (ms: number) => new Date(now.getTime() - ms)
  const MIN = 60_000
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR

  it('rounds DOWN so a wait is never overstated', () => {
    // 1h59m is "1 hr", not "2 hr". This figure is meant to make neglect
    // visible, so inventing neglect that has not happened is as wrong as
    // hiding it.
    expect(describeAge(ago(HOUR + 59 * MIN), now)).toBe('1 hr')
    expect(describeAge(ago(2 * DAY + 23 * HOUR), now)).toBe('2 d')
  })

  it('covers each unit boundary', () => {
    expect(describeAge(ago(30_000), now)).toBe('just now')
    expect(describeAge(ago(MIN), now)).toBe('1 min')
    expect(describeAge(ago(59 * MIN), now)).toBe('59 min')
    expect(describeAge(ago(HOUR), now)).toBe('1 hr')
    expect(describeAge(ago(23 * HOUR), now)).toBe('23 hr')
    expect(describeAge(ago(DAY), now)).toBe('1 d')
  })
})

describe('describeTrend', () => {
  it('names the previous figure, so a direction is never bare', () => {
    expect(describeTrend(9, 6)).toBe('up from 6')
    expect(describeTrend(4, 6)).toBe('down from 6')
  })

  it('does not divide by a zero baseline', () => {
    expect(describeTrend(5, 0)).toBe('none last week')
    expect(describeTrend(0, 0)).toBe('none last week either')
  })

  it('says "same" rather than reporting a 0% change', () => {
    expect(describeTrend(6, 6)).toBe('same as last week (6)')
  })

  it('gives a direction that agrees with the phrase', () => {
    expect(trendDirection(9, 6)).toBe('up')
    expect(trendDirection(4, 6)).toBe('down')
    expect(trendDirection(6, 6)).toBe('flat')
  })
})

describe('topCity', () => {
  it('picks the highest count', () => {
    expect(topCity({ minneapolis: 6, miami: 2 })).toEqual({ key: 'minneapolis', count: 6 })
  })

  it('breaks ties deterministically so the tile cannot flicker', () => {
    // Object key order is not a stable tiebreak; two renders of the same data
    // must name the same city.
    expect(topCity({ miami: 4, minneapolis: 4 })).toEqual({ key: 'miami', count: 4 })
    expect(topCity({ minneapolis: 4, miami: 4 })).toEqual({ key: 'miami', count: 4 })
  })

  it('is null for no leads, rather than an arbitrary city with zero', () => {
    expect(topCity({})).toBeNull()
    expect(topCity({ minneapolis: 0 })).toBeNull()
  })
})

describe('sitesWithNoInbox', () => {
  const cities = [
    { key: 'minneapolis', city: 'Minneapolis', status: 'live' },
    { key: 'miami', city: 'Miami', status: 'live' },
    { key: 'testville', city: 'Testville', status: 'draft' },
  ]

  it('flags a LIVE city whose notify list is empty', () => {
    const result = sitesWithNoInbox(cities, {
      minneapolis: { notifyEmails: ['abdi@example.com'] },
      miami: { notifyEmails: [] },
    })
    expect(result).toEqual([{ key: 'miami', city: 'Miami' }])
  })

  it('flags a LIVE city with no settings row at all', () => {
    // No row is the same failure as an empty row: nobody gets emailed.
    const result = sitesWithNoInbox(cities, {
      minneapolis: { notifyEmails: ['abdi@example.com'] },
    })
    expect(result).toEqual([{ key: 'miami', city: 'Miami' }])
  })

  it('exempts drafts, which have not launched and cannot miss a lead', () => {
    const result = sitesWithNoInbox(cities, {
      minneapolis: { notifyEmails: ['abdi@example.com'] },
      miami: { notifyEmails: ['abdi@example.com'] },
    })
    expect(result).toEqual([])
  })
})
