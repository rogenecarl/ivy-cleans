import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { MAX_PHOTO_EDGE, optimizePhoto, sniffImageType } from '../src/pipeline/photo-process'

describe('sniffImageType', () => {
  it('reads the header, not the name', async () => {
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).png().toBuffer()
    const jpg = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).jpeg().toBuffer()
    const webp = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).webp().toBuffer()
    expect(sniffImageType(new Uint8Array(png))).toBe('image/png')
    expect(sniffImageType(new Uint8Array(jpg))).toBe('image/jpeg')
    expect(sniffImageType(new Uint8Array(webp))).toBe('image/webp')
    expect(sniffImageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull()
    expect(sniffImageType(new TextEncoder().encode('GIF89a......'))).toBeNull()
  })
})

describe('optimizePhoto', () => {
  it('shrinks a phone-sized photo to the web size as a much smaller WebP', async () => {
    const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: { r: 120, g: 160, b: 140 } } })
      .jpeg({ quality: 95 })
      .toBuffer()
    const out = await optimizePhoto(new Uint8Array(big))
    const meta = await sharp(Buffer.from(out.bytes)).metadata()
    expect(out.type).toBe('image/webp')
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(MAX_PHOTO_EDGE)
    expect(meta.height).toBe(1200)
    expect(out.bytes.byteLength).toBeLessThan(big.byteLength)
  })

  it('leaves a small photo at its size', async () => {
    const small = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#abc' } }).png().toBuffer()
    const meta = await sharp(Buffer.from((await optimizePhoto(new Uint8Array(small))).bytes)).metadata()
    expect([meta.width, meta.height]).toEqual([800, 600])
  })
})
