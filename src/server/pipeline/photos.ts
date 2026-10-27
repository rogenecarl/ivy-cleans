// Rules for operator photo uploads; the file itself is written by admin-logic.
export const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024
export const MAX_PHOTOS = 12
export const MAX_CAPTION_LENGTH = 200

/** null when the upload is acceptable, else the reason in the operator's terms. */
export function checkPhotoUpload(input: { type: string; size: number; count: number; alt: string }): string | null {
  if (!(input.type in PHOTO_TYPES)) return 'only JPG, PNG and WebP photos are accepted'
  if (input.size === 0) return 'the file is empty'
  if (input.size > MAX_PHOTO_BYTES) return `the file is over ${MAX_PHOTO_BYTES / 1024 / 1024} MB`
  if (input.count >= MAX_PHOTOS) return `at most ${MAX_PHOTOS} photos per city`
  if (input.alt.trim() === '') return 'a caption is required: it is the alt text'
  if (input.alt.length > MAX_CAPTION_LENGTH) return `the caption is over ${MAX_CAPTION_LENGTH} characters`
  return null
}

/** `<stamp>-<cleaned original name>.<ext>`; the original name is for the operator, the stamp keeps it unique. */
export function photoFileName(originalName: string, type: string, stamp: number): string {
  const ext = PHOTO_TYPES[type]
  const base = originalName
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${stamp}-${base || 'photo'}.${ext}`
}

/** The public path a stored photo is served at. */
export function photoPath(cityKey: string, fileName: string): string {
  return `/photos/${cityKey}/${fileName}`
}

/** True when `p` is a photo path inside this city's folder: the only paths the remove action will touch. */
export function isCityPhotoPath(cityKey: string, p: string): boolean {
  return /^\/photos\/[a-z0-9-]+\/[a-z0-9.-]+$/.test(p) && p.startsWith(`/photos/${cityKey}/`)
}
