// tests/auth-guards.test.ts
/*
 * Every server action rejects a caller who should not reach it.
 *
 * WHY THIS SUITE EXISTS, precisely: the (console) layout's requireSession()
 * runs when a PAGE renders. A server action is a POST to an action id, and
 * Next runs it without rendering the layout — so a signed-in manager who has
 * never loaded /admin/sites can still invoke publishAction by POSTing its id.
 * The layout guard cannot see that request. Only a guard inside the action
 * can, which is what these tests pin down.
 *
 * The assertion that matters is not "it threw" — it is "the store was never
 * called". An action that throws AFTER writing has still written.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// next/navigation's redirect() throws a tagged error; the guards signal with
// it, so the mocks reproduce that rather than returning.
const REDIRECTED = 'NEXT_REDIRECT'
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`${REDIRECTED}:${to}`)
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const setLeadStatus = vi.fn()
const setLeadNotes = vi.fn()
const upsertSiteSettings = vi.fn()
vi.mock('@/leads/store', async () => {
  const actual = await vi.importActual<typeof import('@/leads/store')>('@/leads/store')
  return { ...actual, setLeadStatus, setLeadNotes, upsertSiteSettings }
})

const publishLogic = vi.fn()
const finalizeLogic = vi.fn()
const createDraftFromFields = vi.fn()
vi.mock('@/pipeline/admin-logic', async () => {
  const actual = await vi.importActual<typeof import('@/pipeline/admin-logic')>(
    '@/pipeline/admin-logic',
  )
  return { ...actual, publishLogic, finalizeLogic, createDraftFromFields, listCities: vi.fn(async () => []) }
})

// The guard module itself is mocked: these tests are about whether each
// action CALLS a guard, not about whether the guard works (that is
// src/lib/auth-server.ts's own concern, exercised by hand in Task 9).
const requireAdmin = vi.fn()
const requireSession = vi.fn()
vi.mock('@/lib/auth-server', () => ({
  requireAdmin: () => requireAdmin(),
  requireSession: () => requireSession(),
}))

function signedOut() {
  requireSession.mockImplementation(() => {
    throw new Error(`${REDIRECTED}:/admin/login`)
  })
  requireAdmin.mockImplementation(() => {
    throw new Error(`${REDIRECTED}:/admin/login`)
  })
}

function asManager() {
  requireSession.mockResolvedValue({ id: 'u1', name: 'M', email: 'm@x', role: 'manager' })
  requireAdmin.mockImplementation(() => {
    throw new Error(`${REDIRECTED}:/admin/dashboard`)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('admin-only pipeline actions', () => {
  /*
   * Every export of (console)/actions.ts, listed literally rather than
   * discovered, so that ADDING an export without adding it here is a visible
   * omission in review rather than a silently uncovered endpoint.
   */
  const cases: [string, (m: typeof import('@/app/admin/(console)/actions')) => Promise<unknown>][] = [
    ['createDraftAction', (m) => m.createDraftAction(new FormData())],
    ['runStageAction', (m) => m.runStageAction('miami', 'facts')],
    ['regenerateAction', (m) => m.regenerateAction('miami', 'facts')],
    ['finalizeAction', (m) => m.finalizeAction('miami')],
    ['updateSuburbsAction', (m) => m.updateSuburbsAction('miami', [])],
    ['publishAction', (m) => m.publishAction('miami')],
    ['listCitiesAction', (m) => m.listCitiesAction()],
    ['getProgressAction', (m) => m.getProgressAction('miami')],
  ]

  for (const [name, call] of cases) {
    it(`${name} refuses a manager and does no work`, async () => {
      asManager()
      const mod = await import('@/app/admin/(console)/actions')
      await expect(call(mod)).rejects.toThrow(REDIRECTED)
      expect(requireAdmin).toHaveBeenCalled()
      expect(publishLogic).not.toHaveBeenCalled()
      expect(finalizeLogic).not.toHaveBeenCalled()
      expect(createDraftFromFields).not.toHaveBeenCalled()
    })

    it(`${name} refuses a signed-out caller`, async () => {
      signedOut()
      const mod = await import('@/app/admin/(console)/actions')
      await expect(call(mod)).rejects.toThrow(REDIRECTED)
    })
  }
})

describe('saveNotifyEmailsAction', () => {
  it('refuses a manager and never writes settings', async () => {
    asManager()
    const mod = await import('@/app/admin/(console)/sites/site-actions')
    const form = new FormData()
    form.set('emails', 'x@y.com')
    await expect(mod.saveNotifyEmailsAction('miami', form)).rejects.toThrow(REDIRECTED)
    expect(upsertSiteSettings).not.toHaveBeenCalled()
  })
})

describe('lead actions', () => {
  it('setStatusAction refuses a signed-out caller and never writes', async () => {
    signedOut()
    const mod = await import('@/app/admin/(console)/leads/lead-actions')
    await expect(mod.setStatusAction('lead-1', 'booked')).rejects.toThrow(REDIRECTED)
    expect(setLeadStatus).not.toHaveBeenCalled()
  })

  it('saveNotesAction refuses a signed-out caller and never writes', async () => {
    signedOut()
    const mod = await import('@/app/admin/(console)/leads/lead-actions')
    const form = new FormData()
    form.set('notes', 'hello')
    await expect(mod.saveNotesAction('lead-1', form)).rejects.toThrow(REDIRECTED)
    expect(setLeadNotes).not.toHaveBeenCalled()
  })

  it('allows a manager through — leads are their job', async () => {
    asManager()
    const mod = await import('@/app/admin/(console)/leads/lead-actions')
    await mod.setStatusAction('lead-1', 'booked')
    expect(requireSession).toHaveBeenCalled()
    expect(setLeadStatus).toHaveBeenCalledWith('lead-1', 'booked')
  })
})
