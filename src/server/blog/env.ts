// The one place the blog feature reads env. Blank and absent both mean "not configured".
import { readEnv as read } from '@/server/infra/env'

/** Bearer token the blog tool sends with every webhook delivery. null = webhook disabled (every delivery is 401). */
export const BLOGR_WEBHOOK_TOKEN = read('BLOGR_WEBHOOK_TOKEN')

if (!process.env.VITEST && BLOGR_WEBHOOK_TOKEN === null) {
  console.error('blog env: BLOGR_WEBHOOK_TOKEN is not set (or is blank) -- every webhook delivery will be rejected with 401.')
}
