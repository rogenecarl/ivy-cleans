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
  /*
   * ?signedout=1 is the whole flash mechanism, and it is enough because
   * sign-out has exactly one destination. The login form toasts on it and
   * strips it from the URL. Sign-IN cannot use the same trick -- it lands
   * wherever safeNext() sends it -- which is why there is no matching
   * success toast there.
   */
  redirect(`${ADMIN_LOGIN}?signedout=1`)
}
