import { auth } from '@/server/auth/auth'
import { toNextJsHandler } from 'better-auth/next-js'

// better-auth's endpoints; /api is excluded from the city rewrite by the proxy matcher
export const { POST, GET } = toNextJsHandler(auth)
