// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

/*
 * Browser-side client. Only the sign-out button and the identity chip use it;
 * sign-in goes through a server action so the rate limiter can see the real
 * client IP.
 *
 * NO `baseURL`, deliberately. Passing one short-circuits better-auth's own
 * resolution (client/config.mjs:24 — `getBaseURL(options?.baseURL, ...)`
 * returns immediately on any truthy value), so an env var that is unset in
 * production silently pins the client to whatever the fallback literal says.
 * Left unset, the chain ends at the relative "/api/auth", which is same-origin
 * and correct: this console is served from the same host as its API route.
 * One fewer variable to misconfigure, and no way for it to be wrong.
 */
export const authClient = createAuthClient()

export const { signOut, useSession } = authClient
