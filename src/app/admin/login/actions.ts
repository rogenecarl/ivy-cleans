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
import { getServerUser } from '@/lib/auth-server'
import { safeNext } from '@/lib/access'
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

  try {
    await auth.api.signInEmail({ body: { email, password }, headers: headersList })
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
   * Re-read the session rather than trusting signInEmail's return: the role
   * decides where they land, and getServerUser() is the one function that
   * validates it against src/lib/access.ts. redirect() throws, so it sits
   * outside the try/catch above — swallowing it would silently do nothing.
   */
  const user = await getServerUser()
  if (!user) return { error: CREDENTIALS_REJECTED }
  redirect(safeNext(next, user.role))
}
