// src/lib/auth.ts
// The auth instance. No social providers (accounts come from the seed script only), and NO client-side
// authClient anywhere — one with a `baseURL` would short-circuit better-auth's own resolution.
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { prisma } from './db'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // THE DOOR: without this an anonymous POST to /sign-up/email creates a manager account. Accounts come from scripts/seed-user.mjs only.
    disableSignUp: true,
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'manager',
        // role can never be set from a request body; second layer behind disableSignUp
        input: false,
      },
    },
  },

  session: {
    cookieCache: {
      // lets the proxy read the role from a signed cookie; five-minute staleness is fine since the proxy doesn't enforce
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
