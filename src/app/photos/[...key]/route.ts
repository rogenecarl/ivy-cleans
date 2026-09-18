import { NextResponse } from 'next/server'
import { readPhoto } from '@/pipeline/photo-store'

// Serves a city photo from Backblaze at the same /photos/<city>/<file> path a repo file would have. File names carry
// a timestamp, so the response can be cached for good.
const PHOTO_PATH = /^photos\/[a-z0-9-]+\/[a-z0-9.-]+$/

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  // the catch-all carries only the segments after /photos/
  const { key } = await params
  const objectPath = `photos/${key.join('/')}`
  if (!PHOTO_PATH.test(objectPath)) return new NextResponse('Not found', { status: 404 })
  const photo = await readPhoto(`/${objectPath}`)
  if (photo === null) return new NextResponse('Not found', { status: 404 })
  return new NextResponse(Buffer.from(photo.bytes), {
    headers: {
      'Content-Type': photo.contentType,
      'Content-Length': String(photo.bytes.byteLength),
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  })
}
