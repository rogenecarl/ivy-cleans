// src/lib/auth-server.ts
/*
 * THE ENFORCEMENT POINT. Everything else that looks like authorization in
 * this codebase — the proxy's redirect, the nav's tab filtering, the
 * dashboard's role branch — is presentation. This is the file that decides.
 *
 * Modelled on peaktransport/src/lib/auth-server.ts, with one difference worth
 * knowing about: peaktransport's requireRole takes the role as an argument.
 * Here the two guards are named functions instead, because there are exactly
 * two answers and a named requireAdmin() reads correctly at the top of a
 * server action, which is where most of these calls live.
 *
 * Both guards signal by calling redirect(), which THROWS. In a page that
 * renders a redirect; in a server action it aborts before any mutation runs
 * and returns a redirect to the caller — including a caller that POSTed the
 * action id directly with no page involved, which is the case that matters.
 */
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './auth'
import { isRole, type Role } from './access'
import { ADMIN_DASHBOARD, ADMIN_LOGIN } from './admin-routes'

export type AdminUser = {
  id: string
  name: string
  email: string
  role: Role
}

/** The raw session, server-verified. Returns null when signed out. */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() })
}

/**
 * The signed-in operator, or null.
 *
 * An authenticated user whose `role` column is not one of the two known
 * roles is treated as NOT SIGNED IN rather than defaulting to `manager`. A
 * value that is neither means the database and src/lib/access.ts disagree,
 * and guessing which side is right is how a privilege bug gets introduced.
 */
export async function getServerUser(): Promise<AdminUser | null> {
  const session = await getServerSession()
  if (!session?.user) return null
  const role = (session.user as { role?: unknown }).role
  if (!isRole(role)) {
    console.error('auth: session user has an unrecognised role; treating as signed out')
    return null
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role,
  }
}

/**
 * Require any signed-in operator. Redirects to the login screen otherwise.
 *
 * `next` is echoed into the login URL so the operator lands back where they
 * were aiming. It is validated on the way OUT by safeNext() in the login
 * action, not here — this side only has to avoid putting something silly in
 * a query string.
 */
export async function requireSession(next?: string): Promise<AdminUser> {
  const user = await getServerUser()
  if (!user) {
    redirect(next ? `${ADMIN_LOGIN}?next=${encodeURIComponent(next)}` : ADMIN_LOGIN)
  }
  return user
}

/**
 * Require the admin role.
 *
 * A signed-in manager is bounced to the dashboard, not to the login screen:
 * they are authenticated, just not authorized, and sending them to a login
 * form they have already satisfied reads as a broken session.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await requireSession()
  if (user.role !== 'admin') {
    redirect(ADMIN_DASHBOARD)
  }
  return user
}
