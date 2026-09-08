// src/lib/access.ts
// The whole role policy as pure functions. Three consumers must not drift: proxy.ts (UX redirect),
// (console) layout/page guards, nav.tsx. None of this enforces on its own — auth-server.ts does.
import { ADMIN_BASE, ADMIN_DASHBOARD, ADMIN_LEADS, ADMIN_LOGIN, ADMIN_SITES } from './admin-routes'

export type Role = 'admin' | 'manager'

export const ROLES: readonly Role[] = ['admin', 'manager'] as const

/** Narrows an unknown (a DB column, a cookie payload) to a Role. */
export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export type NavTab = { href: string; label: string }

// the console's sections in bar order, with the roles that may reach each. This array IS the matrix.
const SECTIONS: readonly { href: string; label: string; roles: readonly Role[] }[] = [
  { href: ADMIN_DASHBOARD, label: 'Dashboard', roles: ['admin', 'manager'] },
  { href: ADMIN_LEADS, label: 'Leads', roles: ['admin', 'manager'] },
  { href: ADMIN_SITES, label: 'Sites', roles: ['admin'] },
  // pipeline screens: not tabs, but real paths a manager must not reach. Empty label keeps them out of the nav.
  { href: `${ADMIN_BASE}/new`, label: '', roles: ['admin'] },
  { href: `${ADMIN_BASE}/generate`, label: '', roles: ['admin'] },
  { href: `${ADMIN_BASE}/review`, label: '', roles: ['admin'] },
] as const

// `pathname` is `href` or beneath it, without the /admin/sitesX prefix collision. Shared with resolve-admin.ts and proxy.ts.
export function isUnder(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function navTabsFor(role: Role): readonly NavTab[] {
  return SECTIONS.filter((s) => s.label !== '' && s.roles.includes(role)).map((s) => ({
    href: s.href,
    label: s.label,
  }))
}

// default-deny for non-admins: a section missing from SECTIONS is closed to managers
export function canAccess(role: Role, pathname: string): boolean {
  if (role === 'admin') return true
  // Login and the /admin redirect stub are reachable by anyone signed in.
  if (pathname === ADMIN_LOGIN || pathname === ADMIN_BASE) return true
  const section = SECTIONS.find((s) => isUnder(pathname, s.href))
  return section ? section.roles.includes(role) : false
}

// validate ?next=: must start with /admin, be reachable by the role, and not be the login page.
// `//evil.example` is protocol-relative, hence the separate check.
export function safeNext(next: string | null | undefined, role: Role): string {
  if (!next) return ADMIN_DASHBOARD
  if (next.startsWith('//')) return ADMIN_DASHBOARD
  if (!isUnder(next, ADMIN_BASE)) return ADMIN_DASHBOARD
  if (isUnder(next, ADMIN_LOGIN)) return ADMIN_DASHBOARD
  if (!canAccess(role, next)) return ADMIN_DASHBOARD
  return next
}
