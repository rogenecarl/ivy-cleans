'use server'
// Sign-in as a server action so the rate limiter keys on a trustworthy client IP
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { APIError } from 'better-auth/api'
import { auth } from '@/lib/auth'
import { isRole, safeNext } from '@/lib/access'
import { checkRateLimit, RATE_LIMITS } from '@/lib/auth-rate-limit'
import { clientIp } from '@/leads/client-ip'

export type SignInState = { error: string } | null

// one message for every credential failure: distinguishing them leaks which addresses are real
const CREDENTIALS_REJECTED = 'Wrong email or password.'

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '')

  if (!email || !password) return { error: 'Enter your email and password.' }

  const headersList = await headers()
  const limit = checkRateLimit({
    key: 'sign-in',
    identifier: clientIp(headersList) ?? 'unknown',
    ...RATE_LIMITS.signIn,
  })
  if (!limit.success) {
    return { error: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.` }
  }

  let result: Awaited<ReturnType<typeof auth.api.signInEmail>>
  try {
    result = await auth.api.signInEmail({ body: { email, password }, headers: headersList })
  } catch (err) {
    if (isRedirectError(err)) throw err
    // log the failure, never the address or password
    if (err instanceof APIError) return { error: CREDENTIALS_REJECTED }
    console.error('signInAction: unexpected failure:', err)
    return { error: 'Could not sign you in. Try again.' }
  }

  // validate the role from signInEmail's OWN response. getServerUser() reads headers() — the incoming request's
  // snapshot — which never reflects a cookie set in this same action, so it reported "wrong password" after a
  // correct sign-in (found by scripts/admin-e2e.mjs). redirect() throws, so it sits outside the try.
  const role = (result.user as { role?: unknown } | undefined)?.role
  if (!isRole(role)) {
    // an unknown role means the database and access.ts disagree: log it
    console.error('signInAction: signed-in user has an unrecognised role; refusing')
    // the session cookie is already set; sign back out so this path can't leave a stale cookie
    await auth.api.signOut({ headers: headersList })
    return { error: CREDENTIALS_REJECTED }
  }
  // ?signedin=1 raises the toast in the console layout; appended AFTER safeNext() so it can't steer the redirect
  const target = safeNext(next, role)
  redirect(`${target}${target.includes('?') ? '&' : '?'}signedin=1`)
}
