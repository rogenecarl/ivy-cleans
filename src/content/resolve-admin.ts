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
  const bare = pathname.split('?')[0]
  if (!isUnder(bare, ADMIN_BASE)) return null

  const isLogin = isUnder(bare, ADMIN_LOGIN)

  if (!session) {
    // Signed out: everything but the login page goes to the login page,
    // carrying where they were aiming so they land there afterwards.
    return isLogin ? null : `${ADMIN_LOGIN}?next=${encodeURIComponent(bare)}`
  }

  if (isLogin) return ADMIN_DASHBOARD

  const role = session.role
  if (!isRole(role)) return null
  return canAccess(role, bare) ? null : ADMIN_DASHBOARD
}
