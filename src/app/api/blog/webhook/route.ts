import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { loadRouting } from '@/content/resolve-rewrite'
import { getCity } from '@/content/store'
import { BLOGR_WEBHOOK_TOKEN } from '@/blog/env'
import { receiveDelivery } from '@/blog/receive'
import { candidatesOutside, postBySlug, upsertPost } from '@/blog/store'

// Blog-tool deliveries for every city land here; the payload's website.domain picks the city.
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { domains } = await loadRouting()
  const result = await receiveDelivery(
    { authorization: request.headers.get('authorization'), body, host: request.headers.get('host') ?? '' },
    {
      expectedToken: BLOGR_WEBHOOK_TOKEN,
      domains,
      getCity,
      upsertPost,
      postBySlug,
      candidatesOutside,
      revalidate: (paths) => {
        for (const path of paths) revalidatePath(path)
      },
    },
  )
  return NextResponse.json(result.body, { status: result.status })
}
