import type { SiteSummary } from '@/server/pipeline/admin-logic'
/*
 * The dashboard's numbers, as a test.
 *
 * These exist because every function here can be wrong in a way that still
 * renders perfectly: an alarm that fails to fire, an age that rounds a
 * two-day-old lead up to "3 d", a top city that flips between two equal
 * cities on consecutive renders. None of that throws, none of it looks
 * broken, and all of it would be quoted back as fact.
 */
import { describe, expect, it } from 'vitest'
import { canAccess } from '@/server/auth/access'
import {
  activeAlarms,
  type Alarm,
  describeAge,
  describeTrend,
  quickActionsFor,
  sitesWithNoInbox,
  topCity,
  trendDirection,
  visibleAlarms,
  attentionItems,
  bucketByWeek,
  pipelineBuckets,
} from '@/app/admin/(console)/dashboard/logic'

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

describe('activeAlarms', () => {
  const now = new Date('2026-08-22T12:00:00Z')
  const clear = { waiting: 0, oldestWaitingAt: null, emailFailed: 0, noInbox: [] }

  it('is empty when every check passes, so the page can show one all-clear line', () => {
    expect(activeAlarms(clear, now)).toEqual([])
  })

  it('reports ONLY the failing check, never the passing ones', () => {
    const alarms = activeAlarms({ ...clear, emailFailed: 2 }, now)
    expect(alarms).toHaveLength(1)
    expect(alarms[0].key).toBe('email')
  })

  it('carries the age of the oldest waiting lead, which is the actionable part', () => {
    const alarms = activeAlarms(
      {
        ...clear,
        waiting: 3,
        oldestWaitingAt: new Date('2026-08-20T12:00:00Z'),
      },
      now,
    )
    expect(alarms[0].value).toBe(3)
    expect(alarms[0].hint).toBe('oldest 2 d')
    expect(alarms[0].label).toBe('Leads waiting for a reply')
  })

  it('says "Lead" not "Leads" for exactly one', () => {
    const alarms = activeAlarms({ ...clear, waiting: 1, oldestWaitingAt: now }, now)
    expect(alarms[0].label).toBe('Lead waiting for a reply')
  })

  it('names the cities that cannot notify anyone', () => {
    const alarms = activeAlarms(
      { ...clear, noInbox: [{ key: 'miami', city: 'Miami' }, { key: 'mpls', city: 'Minneapolis' }] },
      now,
    )
    expect(alarms[0].value).toBe(2)
    expect(alarms[0].hint).toBe('Miami, Minneapolis')
  })

  it('orders by urgency: a waiting customer before a config problem', () => {
    const alarms = activeAlarms(
      {
        waiting: 1,
        oldestWaitingAt: now,
        emailFailed: 1,
        noInbox: [{ key: 'miami', city: 'Miami' }],
      },
      now,
    )
    expect(alarms.map((a) => a.key)).toEqual(['waiting', 'email', 'inbox'])
  })
})

describe('visibleAlarms', () => {
  const waiting: Alarm = { key: 'waiting', label: 'Leads waiting', value: 3, hint: '' }
  const email: Alarm = { key: 'email', label: 'Notifications failed', value: 1, hint: '' }
  const inbox: Alarm = { key: 'inbox', label: 'Live sites with no inbox', value: 2, hint: '' }

  it('shows an admin everything', () => {
    expect(visibleAlarms([waiting, email, inbox], 'admin')).toEqual([waiting, email, inbox])
  })

  it('hides the site alarm from a manager', () => {
    // The no-inbox alarm links to /admin/sites and is fixed there. A manager
    // can do nothing about it, and an alarm nobody can act on trains people
    // to ignore the panel.
    expect(visibleAlarms([waiting, email, inbox], 'manager')).toEqual([waiting, email])
  })

  it('keeps the ordering it was given', () => {
    expect(visibleAlarms([email, waiting], 'manager')).toEqual([email, waiting])
  })

  it('returns empty for a manager whose only alarm is the site one', () => {
    // Which makes the page render its "All clear" line — correct for a
    // manager, whose checks really are all clear.
    expect(visibleAlarms([inbox], 'manager')).toEqual([])
  })
})

describe('quickActionsFor', () => {
  it('offers an admin both actions, leads first', () => {
    expect(quickActionsFor('admin').map((a) => a.key)).toEqual(['leads', 'new-site'])
  })

  it('offers a manager only the leads action', () => {
    expect(quickActionsFor('manager').map((a) => a.key)).toEqual(['leads'])
  })

  it('never offers an action the role cannot reach', () => {
    for (const role of ['admin', 'manager'] as const) {
      for (const action of quickActionsFor(role)) {
        expect(canAccess(role, action.href)).toBe(true)
      }
    }
  })
})

describe('bucketByWeek', () => {
  const now = new Date('2026-10-29T12:00:00Z')
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000)

  it('counts per week, oldest first, ignoring anything older than the window', () => {
    expect(bucketByWeek([daysAgo(0), daysAgo(6.9), daysAgo(7), daysAgo(15), daysAgo(60)], now, 3)).toEqual([1, 1, 2])
  })

  it('returns zeros for an empty list', () => {
    expect(bucketByWeek([], now, 8)).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })
})

describe('pipelineBuckets', () => {
  const site = (key: string, stage: SiteSummary['stage']) => ({ key, stage }) as SiteSummary

  it('puts stopped runs with generating ones, and each other stage in its own bucket', () => {
    const b = pipelineBuckets([
      site('a', 'generating'),
      site('b', 'stopped'),
      site('c', 'needs-review'),
      site('d', 'ready'),
      site('e', 'live'),
    ])
    expect(b.generating.map((s) => s.key)).toEqual(['a', 'b'])
    expect(b.review.map((s) => s.key)).toEqual(['c'])
    expect(b.ready.map((s) => s.key)).toEqual(['d'])
    expect(b.live.map((s) => s.key)).toEqual(['e'])
  })
})

describe('attentionItems', () => {
  const site = (over: Partial<SiteSummary>) =>
    ({ key: 'houston', city: 'Houston', stage: 'needs-review', undecided: 0, hasAddress: true, ...over }) as SiteSummary
  const alarms = [
    { key: 'waiting' as const, label: 'Lead waiting for a reply', value: 1, hint: 'oldest 3 d' },
    { key: 'inbox' as const, label: 'Live sites with no inbox', value: 1, hint: 'Minneapolis' },
  ]

  it('gives every item one action, including drafts missing an address or waiting on facts', () => {
    const items = attentionItems(alarms, [site({ hasAddress: false }), site({ key: 'orlando', city: 'Orlando', undecided: 2 })], 'admin')
    expect(items.map((i) => i.id)).toEqual(['waiting', 'inbox', 'address:houston', 'facts:orlando'])
    expect(items.every((i) => i.action.href.startsWith('/admin'))).toBe(true)
    expect(items.find((i) => i.id === 'address:houston')?.action.href).toBe('/admin/sites/houston')
    expect(items.find((i) => i.id === 'facts:orlando')?.action.href).toBe('/admin/generate/orlando')
  })

  it('shows a manager only what a manager can act on', () => {
    const items = attentionItems(alarms, [site({ hasAddress: false })], 'manager')
    expect(items.map((i) => i.id)).toEqual(['waiting'])
  })

  it('does not ask for an address on a live city or a run still generating', () => {
    const items = attentionItems([], [site({ stage: 'live', hasAddress: false }), site({ key: 'x', stage: 'generating', hasAddress: false })], 'admin')
    expect(items).toEqual([])
  })
})
