// Where a city's photos live: Backblaze when configured, else files under public/. Pages never know which: every
// photo is addressed by its /photos/<city>/<file> path, and src/app/photos/[...key] serves the Backblaze ones.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { B2_BUCKET, b2Client, b2Configured } from '../lib/b2'

const PUBLIC_DIR = path.join(process.cwd(), 'public')

/** "/photos/houston/1-crew.jpg" -> "photos/houston/1-crew.jpg", the object key in the bucket. */
export function photoObjectKey(photoPath: string): string {
  return photoPath.replace(/^\/+/, '')
}

export type StoredPhoto = { bytes: Uint8Array; contentType: string }

export async function putPhoto(photoPath: string, bytes: Uint8Array, contentType: string): Promise<void> {
  if (b2Configured()) {
    await b2Client().send(
      new PutObjectCommand({ Bucket: B2_BUCKET, Key: photoObjectKey(photoPath), Body: bytes, ContentType: contentType }),
    )
    return
  }
  const file = path.join(PUBLIC_DIR, photoPath)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, bytes)
}

/** Removes the object or file; a photo that is already gone is not an error. */
export async function deletePhoto(photoPath: string): Promise<void> {
  if (b2Configured()) {
    await b2Client().send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: photoObjectKey(photoPath) }))
  }
  await rm(path.join(PUBLIC_DIR, photoPath), { force: true })
}

/** The bytes behind a photo path: the local file when there is one, else the bucket; null when neither has it. */
export async function readPhoto(photoPath: string): Promise<StoredPhoto | null> {
  try {
    const bytes = await readFile(path.join(PUBLIC_DIR, photoPath))
    return { bytes, contentType: contentTypeOf(photoPath) }
  } catch {
    // not a local file
  }
  if (!b2Configured()) return null
  try {
    const res = await b2Client().send(new GetObjectCommand({ Bucket: B2_BUCKET, Key: photoObjectKey(photoPath) }))
    const bytes = await res.Body?.transformToByteArray()
    if (!bytes) return null
    return { bytes, contentType: res.ContentType ?? contentTypeOf(photoPath) }
  } catch (err) {
    // a missing object is expected (404); anything else is worth seeing in the server log
    if ((err as { name?: string }).name !== 'NoSuchKey') console.error(`photo-store: read ${photoPath} failed:`, err)
    return null
  }
}

function contentTypeOf(p: string): string {
  const ext = path.extname(p).toLowerCase()
  return ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg'
}
