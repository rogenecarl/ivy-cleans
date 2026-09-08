// src/lib/auth-server.ts
// THE ENFORCEMENT POINT. Everything else that looks like authorization is presentation.
// Both guards redirect(), which throws — in a server action that aborts before any mutation.
import { cache } from 'react'
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

// server-verified session, or null. React.cache so layout and page share one lookup per request.
export const getServerSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})

// the signed-in operator, or null. An unknown role is treated as signed OUT, never as manager.
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

// any signed-in operator, else redirect to login with ?next= (validated on the way out by safeNext)
export async function requireSession(next?: string): Promise<AdminUser> {
  const user = await getServerUser()
  if (!user) {
    redirect(next ? `${ADMIN_LOGIN}?next=${encodeURIComponent(next)}` : ADMIN_LOGIN)
  }
  return user
}

// admin only; a signed-in manager is bounced to the dashboard, not to login
export async function requireAdmin(): Promise<AdminUser> {
  const user = await requireSession()
  if (user.role !== 'admin') {
    redirect(ADMIN_DASHBOARD)
  }
  return user
}
