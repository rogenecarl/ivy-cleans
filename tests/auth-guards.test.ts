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
/*
 * The read paths the eight console pages call, mocked here too (not just the
 * three write paths above) so the page-guard tests below can assert the
 * store was never READ for a refused caller -- the PII-screen equivalent of
 * "the store was never called" for the action tests.
 */
const leadDashboardStats = vi.fn()
const listLeads = vi.fn()
const getSiteSettingsMany = vi.fn()
const countTestLeads = vi.fn()
const leadStatusCounts = vi.fn()
const getLead = vi.fn()
const leadCountsByCity = vi.fn()
const getSiteSettings = vi.fn()
vi.mock('@/leads/store', async () => {
  const actual = await vi.importActual<typeof import('@/leads/store')>('@/leads/store')
  return {
    ...actual,
    setLeadStatus,
    setLeadNotes,
    upsertSiteSettings,
    leadDashboardStats,
    listLeads,
    getSiteSettingsMany,
    countTestLeads,
    leadStatusCounts,
    getLead,
    leadCountsByCity,
    getSiteSettings,
  }
})

// loadDraft/getCity back the generate and review screens -- both admin-only.
const loadDraft = vi.fn()
vi.mock('@/content/drafts', async () => {
  const actual = await vi.importActual<typeof import('@/content/drafts')>('@/content/drafts')
  return { ...actual, loadDraft }
})

const getCity = vi.fn()
vi.mock('@/content/store', async () => {
  const actual = await vi.importActual<typeof import('@/content/store')>('@/content/store')
  return { ...actual, getCity }
})

/*
 * All eight admin-logic functions actions.ts calls, mocked and asserted
 * not-called below -- not just the three (publishLogic/finalizeLogic/
 * createDraftFromFields) an earlier version of this suite covered. Leaving
 * runStageLogic/regenerateLogic/updateSuburbsLogic/getProgressLogic/
 * listCities real would mean their tests pass on `rejects.toThrow(REDIRECTED)`
 * alone -- exactly the "it threw" standard this suite's own header rejects --
 * and would run real pipeline code against the filesystem the moment a guard
 * is ever removed.
 */
const createDraftFromFields = vi.fn()
const runStageLogic = vi.fn()
const regenerateLogic = vi.fn()
const finalizeLogic = vi.fn()
const updateSuburbsLogic = vi.fn()
const updateOpsLogic = vi.fn()
const publishLogic = vi.fn()
const listCities = vi.fn(async () => [])
const getProgressLogic = vi.fn()
vi.mock('@/pipeline/admin-logic', async () => {
  const actual = await vi.importActual<typeof import('@/pipeline/admin-logic')>(
    '@/pipeline/admin-logic',
  )
  return {
    ...actual,
    createDraftFromFields,
    runStageLogic,
    regenerateLogic,
    finalizeLogic,
    updateSuburbsLogic,
    updateOpsLogic,
    publishLogic,
    listCities,
    getProgressLogic,
  }
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

/*
 * A params/searchParams stand-in that REJECTS if ever awaited, with its
 * rejection pre-handled so an unawaited poison doesn't print as an unhandled
 * rejection. Passed to a page in place of the real Promise so that if the
 * guard is not the page's first statement -- if `await params` or
 * `await searchParams` runs before it -- the test fails on THIS rejection,
 * not on REDIRECTED, which pins the guard's position, not just its presence.
 */
function poison(label: string): Promise<never> {
  const p = Promise.reject(new Error(`${label} was awaited before the guard ran`))
  p.catch(() => {})
  return p
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

  /*
   * Asserted against every one of the eight, on every case -- not just the
   * function the case under test would have called. A guard removed from
   * ANY export must fail SOME case's "no work happened" assertion; asserting
   * only the matching mock would still catch a missing guard (the wrong
   * mock gets called), but asserting all eight is what keeps this list
   * honest as a literal enumeration rather than an implicit one.
   */
  function expectNoAdminLogicCalls() {
    expect(createDraftFromFields).not.toHaveBeenCalled()
    expect(runStageLogic).not.toHaveBeenCalled()
    expect(regenerateLogic).not.toHaveBeenCalled()
    expect(finalizeLogic).not.toHaveBeenCalled()
    expect(updateSuburbsLogic).not.toHaveBeenCalled()
    expect(publishLogic).not.toHaveBeenCalled()
    expect(listCities).not.toHaveBeenCalled()
    expect(getProgressLogic).not.toHaveBeenCalled()
  }

  for (const [name, call] of cases) {
    it(`${name} refuses a manager and does no work`, async () => {
      asManager()
      const mod = await import('@/app/admin/(console)/actions')
      await expect(call(mod)).rejects.toThrow(REDIRECTED)
      expect(requireAdmin).toHaveBeenCalled()
      expectNoAdminLogicCalls()
    })

    it(`${name} refuses a signed-out caller and does no work`, async () => {
      signedOut()
      const mod = await import('@/app/admin/(console)/actions')
      await expect(call(mod)).rejects.toThrow(REDIRECTED)
      expectNoAdminLogicCalls()
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

describe('saveOpsAction', () => {
  /*
   * The ops block is the one input nobody can research or regenerate, and
   * this action REPLACES it wholesale — a write that reaches the store
   * before the guard does would overwrite a market's real facts with a
   * hostile caller's, on a live city, with no draft left to recover from.
   */
  it('refuses a manager and never writes ops', async () => {
    asManager()
    const mod = await import('@/app/admin/(console)/sites/site-actions')
    const form = new FormData()
    form.set('crewLead', 'Maria')
    await expect(mod.saveOpsAction('miami', form)).rejects.toThrow(REDIRECTED)
    expect(updateOpsLogic).not.toHaveBeenCalled()
  })

  it('refuses a signed-out caller and never writes ops', async () => {
    signedOut()
    const mod = await import('@/app/admin/(console)/sites/site-actions')
    const form = new FormData()
    form.set('crewLead', 'Maria')
    await expect(mod.saveOpsAction('miami', form)).rejects.toThrow(REDIRECTED)
    expect(updateOpsLogic).not.toHaveBeenCalled()
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

describe('console page guards', () => {
  /*
   * Every one of the eight (console) pages, listed literally like the
   * actions above, for the same reason: an added page without an added case
   * here is a visible gap in review, not a silent one.
   *
   * Dashboard/Leads/lead-detail take requireSession() -- both roles reach
   * them, so the only "wrong caller" is signed-out. Sites/sites-settings/
   * new/generate/review take requireAdmin() -- a manager is the realistic
   * wrong caller (they are signed in, just not authorized), so those get
   * both a manager case and a signed-out case, matching the split the
   * action tests above already use.
   */

  it('dashboard/page.tsx requires a session and reads nothing when refused', async () => {
    signedOut()
    const mod = await import('@/app/admin/(console)/dashboard/page')
    await expect(mod.default()).rejects.toThrow(REDIRECTED)
    expect(leadDashboardStats).not.toHaveBeenCalled()
    expect(listLeads).not.toHaveBeenCalled()
    expect(getSiteSettingsMany).not.toHaveBeenCalled()
    expect(listCities).not.toHaveBeenCalled()
  })

  it('leads/page.tsx requires a session and reads no leads when refused', async () => {
    signedOut()
    const mod = await import('@/app/admin/(console)/leads/page')
    await expect(mod.default({ searchParams: poison('searchParams') })).rejects.toThrow(REDIRECTED)
    expect(listLeads).not.toHaveBeenCalled()
    expect(countTestLeads).not.toHaveBeenCalled()
    expect(leadStatusCounts).not.toHaveBeenCalled()
    expect(listCities).not.toHaveBeenCalled()
  })

  it("leads/[id]/page.tsx requires a session and never reads the lead when refused", async () => {
    signedOut()
    const mod = await import('@/app/admin/(console)/leads/[id]/page')
    await expect(mod.default({ params: poison('params') })).rejects.toThrow(REDIRECTED)
    expect(getLead).not.toHaveBeenCalled()
  })

  it('sites/page.tsx refuses a manager and reads nothing', async () => {
    asManager()
    const mod = await import('@/app/admin/(console)/sites/page')
    await expect(mod.default({ searchParams: poison('searchParams') })).rejects.toThrow(REDIRECTED)
    expect(listCities).not.toHaveBeenCalled()
    expect(leadCountsByCity).not.toHaveBeenCalled()
    expect(getSiteSettingsMany).not.toHaveBeenCalled()
  })

  it('sites/page.tsx refuses a signed-out caller', async () => {
    signedOut()
    const mod = await import('@/app/admin/(console)/sites/page')
    await expect(mod.default({ searchParams: poison('searchParams') })).rejects.toThrow(REDIRECTED)
  })

  it("sites/[key]/page.tsx refuses a manager and never reads that city's settings", async () => {
    asManager()
    const mod = await import('@/app/admin/(console)/sites/[key]/page')
    await expect(
      mod.default({ params: poison('params'), searchParams: poison('searchParams') }),
    ).rejects.toThrow(REDIRECTED)
    expect(getSiteSettings).not.toHaveBeenCalled()
  })

  it('sites/[key]/page.tsx refuses a signed-out caller', async () => {
    signedOut()
    const mod = await import('@/app/admin/(console)/sites/[key]/page')
    await expect(
      mod.default({ params: poison('params'), searchParams: poison('searchParams') }),
    ).rejects.toThrow(REDIRECTED)
    expect(getSiteSettings).not.toHaveBeenCalled()
  })

  it('new/page.tsx refuses a manager before its searchParams are ever read', async () => {
    asManager()
    const mod = await import('@/app/admin/(console)/new/page')
    await expect(mod.default({ searchParams: poison('searchParams') })).rejects.toThrow(REDIRECTED)
  })

  it('new/page.tsx refuses a signed-out caller', async () => {
    signedOut()
    const mod = await import('@/app/admin/(console)/new/page')
    await expect(mod.default({ searchParams: poison('searchParams') })).rejects.toThrow(REDIRECTED)
  })

  it('generate/[key]/page.tsx refuses a manager and never loads the draft', async () => {
    asManager()
    const mod = await import('@/app/admin/(console)/generate/[key]/page')
    await expect(mod.default({ params: poison('params') })).rejects.toThrow(REDIRECTED)
    expect(loadDraft).not.toHaveBeenCalled()
  })

  it('generate/[key]/page.tsx refuses a signed-out caller', async () => {
    signedOut()
    const mod = await import('@/app/admin/(console)/generate/[key]/page')
    await expect(mod.default({ params: poison('params') })).rejects.toThrow(REDIRECTED)
    expect(loadDraft).not.toHaveBeenCalled()
  })

  it('review/[key]/page.tsx refuses a manager and never reads the city document', async () => {
    asManager()
    const mod = await import('@/app/admin/(console)/review/[key]/page')
    await expect(mod.default({ params: poison('params') })).rejects.toThrow(REDIRECTED)
    expect(getCity).not.toHaveBeenCalled()
    expect(loadDraft).not.toHaveBeenCalled()
  })

  it('review/[key]/page.tsx refuses a signed-out caller', async () => {
    signedOut()
    const mod = await import('@/app/admin/(console)/review/[key]/page')
    await expect(mod.default({ params: poison('params') })).rejects.toThrow(REDIRECTED)
    expect(getCity).not.toHaveBeenCalled()
    expect(loadDraft).not.toHaveBeenCalled()
  })
})
