'use server'
/*
 * Sign-in, as a server action rather than a client call to better-auth.
 *
 * The reason is the rate limiter: it keys on the client IP, and only the
 * server sees a trustworthy one (src/leads/client-ip.ts already works out
 * which header to believe for this deployment). A browser-side
 * authClient.signIn.email would rate-limit on whatever better-auth's endpoint
 * infers instead, and would not let us fail closed the same way.
 */
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { APIError } from 'better-auth/api'
import { auth } from '@/lib/auth'
import { isRole, safeNext } from '@/lib/access'
import { checkRateLimit, RATE_LIMITS } from '@/lib/auth-rate-limit'
import { clientIp } from '@/leads/client-ip'

export type SignInState = { error: string } | null

/*
 * ONE message for every credential failure — unknown address, wrong password,
 * disabled account. Distinguishing them tells an attacker which addresses are
 * real, which for a two-person console is a meaningful leak.
 */
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
    /*
     * Log the FAILURE, never the address or the password. An APIError here is
     * an expected outcome (bad credentials); anything else is a real fault
     * and worth the stack.
     */
    if (err instanceof APIError) return { error: CREDENTIALS_REJECTED }
    console.error('signInAction: unexpected failure:', err)
    return { error: 'Could not sign you in. Try again.' }
  }

  /*
   * Validate the role from signInEmail's OWN response — found by
   * scripts/admin-e2e.mjs, in a real browser, to be the only correct choice
   * here, not a style preference.
   *
   * This used to re-read the session with getServerUser(), which calls
   * headers() -- the INCOMING request's headers, snapshotted before this
   * action ran. better-auth's nextCookies() plugin applies the new session
   * cookie by calling Next's cookies().set() (the request-scoped, mutable
   * cookie jar); headers() is a separate, read-only view of the original
   * request and never reflects a same-request cookies() mutation. So
   * immediately after a successful sign-in, getServerUser() read the
   * pre-sign-in headers, found no session, and this action reported "Wrong
   * email or password" to an operator who had typed the correct one --
   * while the correct cookie was already on its way to their browser. (The
   * NEXT request -- a reload, or hitting the redirect target below --
   * legitimately carries it, since by then the browser has sent it back;
   * that is exactly why no unit test caught this and why it took a real
   * two-step request lifecycle, in a real browser, to surface it.)
   * redirect() throws, so it sits outside the try/catch above -- swallowing
   * it would silently do nothing.
   */
  const role = (result.user as { role?: unknown } | undefined)?.role
  if (!isRole(role)) {
    // Mirrors auth-server.ts's getServerUser(): an authenticated user whose
    // role isn't one of the two known values means the database and
    // src/lib/access.ts disagree, which is worth a trace, not a silent
    // rejection -- this path used to go through getServerUser() and log
    // there; it no longer does, so it logs here instead.
    console.error('signInAction: signed-in user has an unrecognised role; refusing')
    return { error: CREDENTIALS_REJECTED }
  }
  redirect(safeNext(next, role))
}
