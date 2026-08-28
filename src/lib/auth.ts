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
 */
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { prisma } from './db'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    /*
     * No self-service signup: accounts come from scripts/seed-user.mjs. This
     * does not disable the /sign-up/email endpoint on its own — better-auth
     * exposes it whenever emailAndPassword is enabled — which is why
     * `user.additionalFields.role.input` is false below. Worst case someone
     * POSTs a signup and gets a `manager` account with no password they can
     * use to reach anything; they cannot mint themselves an admin.
     */
    minPasswordLength: 12,
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'manager',
        /*
         * THE IMPORTANT LINE. `input: false` means role can never be set
         * through a request body. Without it, the signup endpoint would
         * accept `{"role":"admin"}` and the whole RBAC split would be
         * decorative.
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
