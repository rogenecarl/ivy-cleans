// What the bytes really are, and a small web-ready copy of them. The browser's declared type is a hint; the file's
// own header decides. sharp is loaded only here and only when a photo is processed: it is a native module, and a
// deployment that cannot load it must not take the whole console down with it.

export type ImageType = 'image/jpeg' | 'image/png' | 'image/webp'

export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  const riff = String.fromCharCode(...bytes.subarray(0, 4))
  const webp = String.fromCharCode(...bytes.subarray(8, 12))
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp'
  return null
}

/** Longest edge after optimisation; a phone photo is 4000px and a page never shows more than about 1200. */
export const MAX_PHOTO_EDGE = 1600
const WEBP_QUALITY = 80

/** Rotated the way the camera meant, shrunk to MAX_PHOTO_EDGE, metadata dropped, saved as WebP. */
export async function optimizePhoto(bytes: Uint8Array): Promise<{ bytes: Uint8Array; type: 'image/webp' }> {
  const { default: sharp } = await import('sharp')
  const out = await sharp(bytes)
    .rotate()
    .resize({ width: MAX_PHOTO_EDGE, height: MAX_PHOTO_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
  return { bytes: new Uint8Array(out), type: 'image/webp' }
}
