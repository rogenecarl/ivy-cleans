/*
 * The console's proxy-level redirect decision, as a pure function.
 *
 * Sits beside resolve-rewrite.ts and for the same reason: proxy.ts stays a
 * thin adapter and the decision is testable in plain node without a
 * NextRequest.
 *
 * THIS IS NOT SECURITY. It reads a client-held cookie and a cached role that
 * can be up to five minutes stale (see session.cookieCache in
 * src/lib/auth.ts). Its entire job is to stop an operator seeing a flash of a
 * page they are about to be bounced from. Enforcement is
 * src/lib/auth-server.ts, one hop later, against a server-verified session.
 *
 * That is why the unreadable-role case passes THROUGH rather than
 * redirecting: on a guess it would bounce a real admin off Sites, and the
 * layer that actually knows is immediately downstream.
 */
import { canAccess, isRole, isUnder } from '@/lib/access'
import { ADMIN_BASE, ADMIN_DASHBOARD, ADMIN_LOGIN } from '@/lib/admin-routes'

export type OptimisticSession = { role?: unknown } | null

/** Returns the path to redirect to, or `null` to let the request continue. */
export function resolveAdminRedirect(
  pathname: string,
  session: OptimisticSession,
): string | null {
  // req.nextUrl.pathname never carries a query string, so this split is dead
  // defensiveness in production — it exists only so this pure function's own
  // tests (tests/middleware.test.ts) can pass a "?next=..." literal without a
  // NextUrl to strip it for them.
  const bare = pathname.split('?')[0]
  if (!isUnder(bare, ADMIN_BASE)) return null

  const isLogin = isUnder(bare, ADMIN_LOGIN)

  if (!session) {
    // Signed out: everything but the login page goes to the login page,
    // carrying where they were aiming so they land there afterwards.
    return isLogin ? null : `${ADMIN_LOGIN}?next=${encodeURIComponent(bare)}`
  }

  // Deliberately does NOT bounce a signed-in operator off the login page.
  // `session` here is a cookie whose presence was checked but never
  // verified (getSessionCookie does no signature or expiry check — see
  // proxy.ts) and a cached role that can be up to five minutes stale. A
  // stale-but-present cookie is exactly what both of this app's session
  // teardown paths produce — a revoked operator's browser until the cache
  // window elapses, or every operator at once after a BETTER_AUTH_SECRET
  // rotation — and redirecting away from /admin/login on nothing but that
  // guess would trap them in a loop with no way back to the form that could
  // recover them. src/app/admin/login/page.tsx already does this bounce
  // correctly, from a server-verified session, and this branch's cost is
  // one extra render for a legitimately signed-in operator who visits
  // /admin/login. Do not re-add this as an optimisation.

  const role = session.role
  if (!isRole(role)) return null
  return canAccess(role, bare) ? null : ADMIN_DASHBOARD
}
