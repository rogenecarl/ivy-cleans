// src/lib/access.ts
/*
 * WHO MAY SEE WHAT. The whole role policy, as pure functions.
 *
 * Deliberately depends on nothing but the path constants: no Prisma, no
 * next/*, no better-auth. That is what lets the matrix be unit-tested
 * exhaustively (tests/access.test.ts) rather than inferred from the
 * behaviour of a proxy, a server component and a client component that
 * cannot be tested in the same place.
 *
 * Three consumers, and they must not drift:
 *   - src/proxy.ts            optimistic redirect, UX only
 *   - src/app/admin/(console) the layout guard and the page guards
 *   - src/app/admin/nav.tsx   which tabs get rendered
 *
 * NONE of this is enforcement on its own. canAccess() is a predicate; the
 * enforcement is src/lib/auth-server.ts calling it against a server-verified
 * session, and every server action calling that. See the spec.
 */
import { ADMIN_BASE, ADMIN_DASHBOARD, ADMIN_LEADS, ADMIN_LOGIN, ADMIN_SITES } from './admin-routes'

export type Role = 'admin' | 'manager'

export const ROLES: readonly Role[] = ['admin', 'manager'] as const

/** Narrows an unknown (a DB column, a cookie payload) to a Role. */
export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export type NavTab = { href: string; label: string }

/*
 * The console's sections, in bar order, each with the roles that may reach
 * it. This array is the matrix — canAccess and navTabsFor both read it, so
 * adding a section here is the ONLY edit needed to place it correctly in
 * both the nav and the guard.
 *
 * Order matters for the nav. It does not matter for canAccess, which matches
 * on the longest applicable prefix rather than the first — see below.
 */
const SECTIONS: readonly { href: string; label: string; roles: readonly Role[] }[] = [
  { href: ADMIN_DASHBOARD, label: 'Dashboard', roles: ['admin', 'manager'] },
  { href: ADMIN_LEADS, label: 'Leads', roles: ['admin', 'manager'] },
  { href: ADMIN_SITES, label: 'Sites', roles: ['admin'] },
  // Pipeline screens. Not tabs — reached from Sites — but they are real
  // paths a manager must not be able to type in, so they belong in the
  // matrix. The empty label is what keeps them out of the nav.
  { href: '/admin/new', label: '', roles: ['admin'] },
  { href: '/admin/generate', label: '', roles: ['admin'] },
  { href: '/admin/review', label: '', roles: ['admin'] },
] as const

/**
 * True when `pathname` is `href` itself or something beneath it.
 *
 * Guards against the prefix collision that would make "/admin/sitesX" look
 * like it lives under "/admin/sites". EXPORTED because Task 11's
 * resolve-admin.ts and proxy.ts need exactly this test too — three
 * hand-rolled `x === h || x.startsWith(h + '/')` chains is three chances to
 * get the boundary wrong in a security predicate.
 */
export function isUnder(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function navTabsFor(role: Role): readonly NavTab[] {
  return SECTIONS.filter((s) => s.label !== '' && s.roles.includes(role)).map((s) => ({
    href: s.href,
    label: s.label,
  }))
}

/**
 * May `role` reach `pathname`?
 *
 * DEFAULT-DENY for any role that is not `admin`. A console path matching no
 * section is refused to a manager and allowed to an admin, so a section added
 * to the route tree without being added to SECTIONS is closed to managers
 * until someone opens it deliberately. The failure mode of forgetting is a
 * manager seeing a bounce, not a manager seeing the Sites pipeline.
 */
export function canAccess(role: Role, pathname: string): boolean {
  if (role === 'admin') return true
  // Login and the /admin redirect stub are reachable by anyone signed in.
  if (pathname === ADMIN_LOGIN || pathname === ADMIN_BASE) return true
  const section = SECTIONS.find((s) => isUnder(pathname, s.href))
  return section ? section.roles.includes(role) : false
}

/**
 * Validates a `?next=` redirect target.
 *
 * An unvalidated next parameter is an open redirect: a crafted login link
 * signs an operator in and then bounces them somewhere else entirely. Three
 * things are rejected — anything not starting with `/admin`, anything the
 * role cannot reach, and the login page itself (which would loop).
 *
 * The `//` check is not redundant with the `/admin` check being first: a
 * browser reads a protocol-relative "//evil.example" as an absolute URL, and
 * "/admin" is checked with startsWith, so "//admin.evil.example" would
 * otherwise have to be caught by luck rather than by rule.
 */
export function safeNext(next: string | null | undefined, role: Role): string {
  if (!next) return ADMIN_DASHBOARD
  if (next.startsWith('//')) return ADMIN_DASHBOARD
  if (!isUnder(next, ADMIN_BASE)) return ADMIN_DASHBOARD
  if (isUnder(next, ADMIN_LOGIN)) return ADMIN_DASHBOARD
  if (!canAccess(role, next)) return ADMIN_DASHBOARD
  return next
}
