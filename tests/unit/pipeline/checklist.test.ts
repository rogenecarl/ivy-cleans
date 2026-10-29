import { describe, expect, it } from 'vitest'
import { publishChecklist } from '@/server/pipeline/admin-logic/checklist'
import type { CityContent } from '@/server/content/types'

const doc = (over: Partial<CityContent> = {}) =>
  ({ city: 'Houston', phone: '713-555-0118', phoneDisplay: '(713) 555-0118', address: '1 Main St, Houston, TX', ...over }) as CityContent

const clean = { undecided: 0, duplicationFindings: 0, invisibleChars: 0, blockingQuality: 0, inboxCount: 1, aboutMissing: [] as string[] }
const state = (r: ReturnType<typeof publishChecklist>, id: string) => r.items.find((i) => i.id === id)?.state

describe('publishChecklist', () => {
  it('lets a clean city publish', () => {
    const r = publishChecklist({ key: 'houston', doc: doc(), ...clean })
    expect(r.canPublish).toBe(true)
    expect(r.items.every((i) => i.state === 'ok')).toBe(true)
  })

  it('blocks publish on the placeholder address, with an action to Settings', () => {
    const r = publishChecklist({ key: 'houston', doc: doc({ address: 'Houston — address pending' }), ...clean })
    expect(r.canPublish).toBe(false)
    const address = r.items.find((i) => i.id === 'address')!
    expect(address).toMatchObject({ state: 'fail', required: true, action: { href: '/admin/sites/houston' } })
  })

  it('lists every failing required line at once', () => {
    const r = publishChecklist({
      key: 'houston',
      doc: doc({ address: 'Houston — address pending' }),
      ...clean,
      undecided: 2,
      duplicationFindings: 1,
      blockingQuality: 3,
    })
    expect(r.items.filter((i) => i.state === 'fail').map((i) => i.id)).toEqual(['address', 'facts', 'duplication', 'quality'])
    expect(r.canPublish).toBe(false)
  })

  it('counts invisible characters as a duplication problem', () => {
    expect(state(publishChecklist({ key: 'houston', doc: doc(), ...clean, invisibleChars: 1 }), 'duplication')).toBe('fail')
  })

  it('does not block on a missing inbox or About page, but lists them to do', () => {
    const r = publishChecklist({ key: 'houston', doc: doc(), ...clean, inboxCount: 0, aboutMissing: ['serving since'] })
    expect(r.canPublish).toBe(true)
    expect(state(r, 'inbox')).toBe('todo')
    expect(state(r, 'about')).toBe('todo')
  })

  it('treats a duplication check that could not run as not done, which blocks', () => {
    const r = publishChecklist({ key: 'houston', doc: doc(), ...clean, duplicationFindings: null })
    expect(state(r, 'duplication')).toBe('todo')
    expect(r.canPublish).toBe(false)
  })
})
