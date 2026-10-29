import path from 'node:path'
import { makeClient } from '@/server/pipeline/model'
import {
  ABOUT_STORY_SLOT,
  ABOUT_SYSTEM,
  AboutStorySchema,
  aboutMissing,
  buildAboutStoryPrompt,
  validateAboutStory,
  type AboutFacts,
} from '@/server/pipeline/about'
import {
  MAX_CAPTION_LENGTH,
  checkPhotoUpload,
  isCityPhotoPath,
  photoFileName,
  photoPath,
} from '@/server/pipeline/photos'
import { deletePhoto, putPhoto } from '@/server/pipeline/photo-store'
import { optimizePhoto, sniffImageType } from '@/server/pipeline/photo-process'
import type { MarketOps } from '@/server/pipeline/schemas'
import { type ActionResult, editCity, errorMessage } from './shared'
import { recordUsage } from './run'
import { type MarketSnapshot, readMarketLogic } from './sites'

export type PhotoUpload = { bytes: Uint8Array; name: string; type: string; alt: string }

/** Stores the file (Backblaze, or public/photos/<key>/ when Backblaze is not configured) and records it on the ops block. */
export async function addPhotoLogic(key: string, upload: PhotoUpload): Promise<ActionResult> {
  try {
    const snapshot = await readMarketLogic(key)
    if (!snapshot.ok) return snapshot
    const count = snapshot.ops?.photos?.length ?? 0
    // the file's own header, not the browser's claim, says what it is
    const realType = sniffImageType(upload.bytes)
    const problem = checkPhotoUpload({ type: realType ?? upload.type, size: upload.bytes.byteLength, count, alt: upload.alt })
    if (problem) return { ok: false, error: problem }
    if (realType === null) return { ok: false, error: `"${upload.name}" is not a JPG, PNG or WebP image` }

    const optimized = await optimizePhoto(upload.bytes)
    const fileName = photoFileName(upload.name, optimized.type, Date.now())
    const photo = { path: photoPath(key, fileName), alt: upload.alt.trim() }
    await putPhoto(photo.path, optimized.bytes, optimized.type)

    return editCity(key, ({ ops, sections }) => ({
      ops: { ...(ops ?? {}), photos: [...(ops?.photos ?? []), photo] },
      sections,
    }))
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/** Drops the photo from the ops block and deletes its file; only paths inside this city's folder are touched. */
export async function removePhotoLogic(key: string, target: string): Promise<ActionResult> {
  try {
    if (!isCityPhotoPath(key, target)) return { ok: false, error: `"${target}" is not one of this city's photos` }
    const result = await editCity(key, ({ ops, sections }) => {
      const photos = (ops?.photos ?? []).filter((p) => p.path !== target)
      const next: MarketOps = { ...(ops ?? {}) }
      if (photos.length) next.photos = photos
      else delete next.photos
      return { ops: Object.keys(next).length ? next : undefined, sections }
    })
    if (!result.ok) return result
    await deletePhoto(target)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/** Captions keyed by photo path; a blank caption is refused because it is the alt text. */
export async function savePhotoCaptionsLogic(key: string, captions: Record<string, string>): Promise<ActionResult> {
  try {
    for (const [target, alt] of Object.entries(captions)) {
      if (alt.trim() === '') return { ok: false, error: `the caption for ${path.basename(target)} is empty` }
      if (alt.length > MAX_CAPTION_LENGTH) return { ok: false, error: `a caption is over ${MAX_CAPTION_LENGTH} characters` }
    }
    return editCity(key, ({ ops, sections }) => ({
      ops: ops?.photos?.length
        ? { ...ops, photos: ops.photos.map((p) => (p.path in captions ? { ...p, alt: captions[p.path].trim() } : p)) }
        : ops,
      sections,
    }))
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

function aboutFactsOf(snapshot: Extract<MarketSnapshot, { ok: true }>): AboutFacts | null {
  if (!snapshot.ops) return null
  return { city: snapshot.city, state: snapshot.state, stateName: snapshot.stateName, ops: snapshot.ops, areaNames: snapshot.areaNames }
}

/** One writing call for the About story, checked against the facts before it is saved. */
export async function writeAboutStoryLogic(key: string): Promise<ActionResult> {
  try {
    const snapshot = await readMarketLogic(key)
    if (!snapshot.ok) return snapshot
    const missing = aboutMissing(snapshot.ops)
    if (missing.length) return { ok: false, error: `the About page still needs: ${missing.join(', ')}` }
    const facts = aboutFactsOf(snapshot)
    if (!facts) return { ok: false, error: 'no market facts saved yet' }

    const client = makeClient()
    const story = await client.generate({
      schema: AboutStorySchema,
      key: 'about',
      system: ABOUT_SYSTEM,
      prompt: buildAboutStoryPrompt(facts),
    })
    await recordUsage(key, client)

    let knownText = ''
    const check = await editCity(key, ({ ops, sections }) => {
      knownText = Object.values(sections)
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .join(' ')
      const verdict = validateAboutStory(story, facts, knownText)
      if (!verdict.ok) return { error: `the story was refused: ${verdict.error}. Try again.` }
      return { ops, sections: { ...sections, [ABOUT_STORY_SLOT]: story.paragraphs.map((p) => p.trim()).filter(Boolean) } }
    })
    return check
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

export async function removeAboutStoryLogic(key: string): Promise<ActionResult> {
  try {
    return await editCity(key, ({ ops, sections }) => {
      const next = { ...sections }
      delete next[ABOUT_STORY_SLOT]
      return { ops, sections: next }
    })
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}
