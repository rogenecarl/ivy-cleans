// The console's proxy-level redirect, as a pure function. NOT security: it reads a client cookie and a role cached
// up to five minutes. Enforcement is auth-server.ts, one hop later. An unreadable role passes through on purpose.
import { canAccess, isRole, isUnder } from '@/lib/access'
import { ADMIN_BASE, ADMIN_DASHBOARD, ADMIN_LOGIN } from '@/lib/admin-routes'

export type OptimisticSession = { role?: unknown } | null

/** Returns the path to redirect to, or `null` to let the request continue. */
export function resolveAdminRedirect(
  pathname: string,
  session: OptimisticSession,
): string | null {
  // nextUrl.pathname never carries a query; the split exists for the tests
  const bare = pathname.split('?')[0]
  if (!isUnder(bare, ADMIN_BASE)) return null

  const isLogin = isUnder(bare, ADMIN_LOGIN)

  if (!session) {
    // Signed out: everything but the login page goes to the login page,
    // carrying where they were aiming so they land there afterwards.
    return isLogin ? null : `${ADMIN_LOGIN}?next=${encodeURIComponent(bare)}`
  }

  // does not bounce a signed-in operator off /admin/login: the cookie is unverified and may be stale (revoked
  // operator, secret rotation), and redirecting would trap them. login/page.tsx bounces from a verified session.

  const role = session.role
  if (!isRole(role)) return null
  return canAccess(role, bare) ? null : ADMIN_DASHBOARD
}
