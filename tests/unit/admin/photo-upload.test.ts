import { describe, expect, it } from 'vitest'
import { safeUpload } from '@/app/admin/_components/photo-dropzone'

describe('safeUpload', () => {
  it('passes a normal result through', async () => {
    expect(await safeUpload(async () => ({ ok: true }), new Blob() as File, 'alt')).toEqual({ ok: true })
  })

  it('turns a request that never reached the server into a failure the panel can show', async () => {
    const r = await safeUpload(async () => Promise.reject(new TypeError('Failed to fetch')), new Blob() as File, 'alt')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/didn’t reach the server/)
  })
})
