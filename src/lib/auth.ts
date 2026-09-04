// src/lib/auth.ts
/*
 * The auth instance. Modelled on peaktransport/src/lib/auth.ts, minus
 * everything this console does not have.
 *
 * NOT PORTED, deliberately:
 *   socialProviders — no Google. A social provider would let any Google
 *     account create a user, which contradicts "accounts come from the seed
 *     script only".
 *   the signup / forget-password / reset-password rate limit rules — those
 *     limit endpoints that do not exist here.
 *
 * NO CLIENT-SIDE authClient / createAuthClient() ANYWHERE IN THIS APP,
 * deliberately, and if one is ever added it must not be given a `baseURL`.
 * Passing one short-circuits better-auth's own resolution
 * (client/config.mjs:24 — `getBaseURL(options?.baseURL, ...)` returns
 * immediately on any truthy value), so an env var that is unset in
 * production would silently pin the client to whatever the fallback literal
 * says. Left unset, the chain ends at the relative "/api/auth", which is
 * same-origin and correct: this console is served from the same host as its
 * own API route. One fewer variable to misconfigure, and no way for it to
 * be wrong. (This reasoning used to live on src/lib/auth-client.ts, deleted
 * as dead code — nothing in src/, tests/ or scripts/ ever imported it; sign-
 * in is a server action and sign-out is src/app/admin/sign-out-action.ts.)
 */
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { prisma } from './db'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    /*
     * THE DOOR. Mounting better-auth's handler exposes /sign-up/email
     * whenever emailAndPassword is enabled, and sign-up.mjs:145 refuses only
     * when this is set. Without it an anonymous POST creates a `manager`
     * account with an attacker-chosen password — and a manager reaches
     * /admin/leads, which holds real customer names, emails and addresses.
     * `input: false` on `role` below stops privilege escalation; it does not
     * stop account creation. Accounts come from scripts/seed-user.mjs only.
     */
    disableSignUp: true,
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'manager',
        /*
         * `input: false` means role can never be set through a request
         * body — the second layer, in case disableSignUp above is ever
         * removed or bypassed. Without it, a signup would accept
         * `{"role":"admin"}` and the whole RBAC split would be decorative.
         * It does NOT, on its own, stop account creation; disableSignUp
         * above is what does that.
         */
        input: false,
      },
    },
  },

  session: {
    cookieCache: {
      /*
       * Lets the proxy read the role from a signed cookie instead of hitting
       * Postgres on every navigation. Five minutes is the staleness window:
       * a role change takes up to that long to reach the proxy's optimistic
       * check. Harmless, because the proxy is not the enforcement point —
       * src/lib/auth-server.ts re-reads the session server-side.
       */
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  rateLimit: {
    // Off by default in development; on here so local behaviour matches prod.
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      // Brute force / credential stuffing. /admin is a guessable URL now, so
      // this is the door that needs the lock.
      '/sign-in/email': { window: 300, max: 5 },
      // Session checks happen on navigation; 20/min keeps normal use clear.
      '/get-session': { window: 60, max: 20 },
    },
  },

  plugins: [nextCookies()],
})
