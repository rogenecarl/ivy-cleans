// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'

/*
 * Browser-side client. Only the sign-out button and the identity chip use it;
 * sign-in goes through a server action so the rate limiter can see the real
 * client IP.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
})

export const { signOut, useSession } = authClient
