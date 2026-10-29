import { describe, expect, it } from 'vitest'
import { siteStage } from '@/server/pipeline/admin-logic/stage'
import type { CityRow } from '@/server/pipeline/admin-logic'

const row = (over: Partial<CityRow> = {}): CityRow => ({ key: 'orlando', city: 'Orlando', status: 'draft', hasDraft: true, ...over })
const base = { lastEventKind: null, hasAddress: true, undecided: 0, blockingQuality: 0 }

describe('siteStage', () => {
  it('a live city goes to its settings', () => {
    expect(siteStage({ ...base, row: row({ status: 'live', hasDraft: false }) })).toEqual({
      stage: 'live',
      reason: null,
      next: { label: 'Settings', href: '/admin/sites/orlando' },
    })
  })

  it('a run under way is watched; one whose last event failed is stopped and resumed', () => {
    expect(siteStage({ ...base, row: row({ status: 'generating' }) }).next).toEqual({
      label: 'Watch progress',
      href: '/admin/generate/orlando',
    })
    const stopped = siteStage({ ...base, lastEventKind: 'error', row: row({ status: 'generating' }) })
    expect(stopped.stage).toBe('stopped')
    expect(stopped.next.label).toBe('Resume')
    // a later event that isn't an error means it is running again
    expect(siteStage({ ...base, lastEventKind: 'found', row: row({ status: 'generating' }) }).stage).toBe('generating')
  })

  it('a finished run that was never finalized is still generating', () => {
    expect(siteStage({ ...base, row: row({ status: 'draft-unfinalized' }) }).stage).toBe('generating')
  })

  it('a draft waiting on facts goes back to the generate screen to decide them', () => {
    const s = siteStage({ ...base, undecided: 3, row: row() })
    expect(s).toMatchObject({ stage: 'needs-review', reason: '3 facts to decide' })
    expect(s.next.href).toBe('/admin/generate/orlando')
  })

  it('a draft without a street address goes to Settings', () => {
    const s = siteStage({ ...base, hasAddress: false, row: row() })
    expect(s).toMatchObject({ stage: 'needs-review', reason: 'No street address' })
    expect(s.next.href).toBe('/admin/sites/orlando')
  })

  it('a draft with blocking quality findings goes to Review', () => {
    const s = siteStage({ ...base, blockingQuality: 2, row: row() })
    expect(s).toMatchObject({ stage: 'needs-review', next: { label: 'Review', href: '/admin/review/orlando' } })
  })

  it('a draft that passes the quick checks is ready to publish', () => {
    expect(siteStage({ ...base, row: row() })).toEqual({
      stage: 'ready',
      reason: null,
      next: { label: 'Publish', href: '/admin/review/orlando' },
    })
  })

  it('a document that will not load is shown with its error, sent to Review', () => {
    const s = siteStage({ ...base, row: row({ status: 'error', hasDraft: false, error: 'bad json' }) })
    expect(s).toMatchObject({ stage: 'needs-review', reason: 'bad json' })
  })

  it('a run paused for fact decisions asks for them, not to be watched', () => {
    const s = siteStage({ ...base, undecided: 3, row: row({ status: 'generating' }) })
    expect(s).toMatchObject({ stage: 'needs-review', reason: '3 facts to decide', next: { label: 'Decide', href: '/admin/generate/orlando' } })
  })
})
