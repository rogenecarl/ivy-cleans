'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ADMIN_LOGIN } from '@/lib/admin-routes'

// server action, not authClient.signOut(): the cookie is cleared on this response, no window with a live cookie
export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() })
  // ?signedout=1 is the whole flash mechanism; sign-out has exactly one destination
  redirect(`${ADMIN_LOGIN}?signedout=1`)
}
