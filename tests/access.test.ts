// tests/access.test.ts
/*
 * The role matrix, tested directly.
 *
 * canAccess() is the single source of truth for "who may see what" and has
 * three consumers that cannot be tested together: the proxy (edge, needs a
 * NextRequest), the console layout (server component, needs a session) and
 * the nav (client component, needs a render). Keeping the policy pure means
 * the matrix itself is covered here, exhaustively and in milliseconds, and
 * the three consumers only have to be checked for "does it call this".
 */
import { describe, expect, it } from 'vitest'
import { canAccess, isRole, navTabsFor, safeNext } from '@/lib/access'
import { ADMIN_DASHBOARD, ADMIN_LEADS, ADMIN_SITES } from '@/lib/admin-routes'

describe('canAccess', () => {
  it('lets an admin reach every console section', () => {
    for (const path of ['/admin', ADMIN_DASHBOARD, ADMIN_LEADS, ADMIN_SITES,
                        '/admin/new', '/admin/generate/miami', '/admin/review/miami']) {
      expect(canAccess('admin', path)).toBe(true)
    }
  })

  it('lets a manager reach only the dashboard and leads', () => {
    expect(canAccess('manager', '/admin')).toBe(true)
    expect(canAccess('manager', ADMIN_DASHBOARD)).toBe(true)
    expect(canAccess('manager', ADMIN_LEADS)).toBe(true)
  })

  it('keeps a manager out of sites and the generation pipeline', () => {
    expect(canAccess('manager', ADMIN_SITES)).toBe(false)
    expect(canAccess('manager', '/admin/new')).toBe(false)
    expect(canAccess('manager', '/admin/generate/miami')).toBe(false)
    expect(canAccess('manager', '/admin/review/miami')).toBe(false)
  })

  it('applies the rule to sub-paths, not just section roots', () => {
    // A lead detail page and a per-city settings page are the paths an
    // operator actually spends time on; getting the prefix rule wrong here
    // would let a manager open /admin/sites/miami while /admin/sites bounced.
    expect(canAccess('manager', `${ADMIN_LEADS}/abc-123`)).toBe(true)
    expect(canAccess('manager', `${ADMIN_SITES}/miami`)).toBe(false)
    expect(canAccess('admin', `${ADMIN_SITES}/miami`)).toBe(true)
  })

  it('does not let a prefix collision open a section', () => {
    // "/admin/sites-secret" must not be treated as being under "/admin/sites".
    expect(canAccess('manager', '/admin/leadsomething')).toBe(false)
    expect(canAccess('manager', '/admin/sitesX')).toBe(false)
  })

  it('denies an unknown console path to a manager and allows it to an admin', () => {
    // Default-deny for the restricted role: a section added later is closed
    // to managers until someone deliberately opens it here.
    expect(canAccess('manager', '/admin/reports')).toBe(false)
    expect(canAccess('admin', '/admin/reports')).toBe(true)
  })

  it('treats login as reachable by anyone', () => {
    expect(canAccess('manager', '/admin/login')).toBe(true)
    expect(canAccess('admin', '/admin/login')).toBe(true)
  })
})

describe('navTabsFor', () => {
  it('gives an admin all three tabs in order', () => {
    expect(navTabsFor('admin').map((t) => t.label)).toEqual(['Dashboard', 'Leads', 'Sites'])
  })

  it('gives a manager no Sites tab at all', () => {
    // Not disabled, not greyed out — absent. A manager should not be shown a
    // control that would bounce them.
    expect(navTabsFor('manager').map((t) => t.label)).toEqual(['Dashboard', 'Leads'])
  })

  it('only offers tabs the role can actually reach', () => {
    // The invariant that keeps the nav and the guard from drifting apart.
    for (const role of ['admin', 'manager'] as const) {
      for (const tab of navTabsFor(role)) {
        expect(canAccess(role, tab.href)).toBe(true)
      }
    }
  })
})

describe('safeNext', () => {
  it('returns the requested path when the role can reach it', () => {
    expect(safeNext(`${ADMIN_LEADS}/abc`, 'manager')).toBe(`${ADMIN_LEADS}/abc`)
  })

  it('falls back to the dashboard when the role cannot', () => {
    expect(safeNext(ADMIN_SITES, 'manager')).toBe(ADMIN_DASHBOARD)
  })

  it('falls back when there is no next at all', () => {
    expect(safeNext(null, 'admin')).toBe(ADMIN_DASHBOARD)
    expect(safeNext(undefined, 'admin')).toBe(ADMIN_DASHBOARD)
    expect(safeNext('', 'admin')).toBe(ADMIN_DASHBOARD)
  })

  it('refuses anything that is not an in-app /admin path', () => {
    // An unvalidated ?next= is an open redirect: a login link could be mailed
    // to an operator that signs them in and then bounces them to an attacker's
    // page. Protocol-relative "//evil.com" is the one people forget — the
    // browser reads it as an absolute URL.
    expect(safeNext('https://evil.example/x', 'admin')).toBe(ADMIN_DASHBOARD)
    expect(safeNext('//evil.example/x', 'admin')).toBe(ADMIN_DASHBOARD)
    expect(safeNext('/', 'admin')).toBe(ADMIN_DASHBOARD)
    expect(safeNext('/minneapolis/home', 'admin')).toBe(ADMIN_DASHBOARD)
    expect(safeNext('javascript:alert(1)', 'admin')).toBe(ADMIN_DASHBOARD)
  })

  it('never bounces back to the login page itself', () => {
    expect(safeNext('/admin/login', 'admin')).toBe(ADMIN_DASHBOARD)
  })
})

describe('isRole', () => {
  it('accepts the two roles and rejects everything else', () => {
    expect(isRole('admin')).toBe(true)
    expect(isRole('manager')).toBe(true)
    expect(isRole('ADMIN')).toBe(false)
    expect(isRole('user')).toBe(false)
    expect(isRole(undefined)).toBe(false)
    expect(isRole(null)).toBe(false)
    expect(isRole(1)).toBe(false)
  })
})
