'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ADMIN_LOGIN } from '@/lib/admin-routes'

/*
 * Ends the session server-side, then bounces to login. Deliberately a server
 * action rather than authClient.signOut(): the cookie is cleared by
 * better-auth's nextCookies() plugin on this response, so there is no window
 * where the browser has navigated away while still holding a live cookie.
 */
export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() })
  redirect(ADMIN_LOGIN)
}
