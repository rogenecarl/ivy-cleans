import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

/*
 * better-auth's endpoints. Lives under /api, which src/proxy.ts's matcher
 * already excludes from the city rewrite — without that exclusion every auth
 * request would be rewritten into /<city>/api/auth/... and 404.
 */
export const { POST, GET } = toNextJsHandler(auth)
