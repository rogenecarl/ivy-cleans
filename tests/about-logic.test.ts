import { afterAll, describe, expect, it } from 'vitest'
import { access, rm } from 'node:fs/promises'
import path from 'node:path'
import { revalidateCity } from '../src/content/store'
import {
  addPhotoLogic,
  createDraftFromFields,
  readMarketLogic,
  removeAboutStoryLogic,
  removePhotoLogic,
  savePhotoCaptionsLogic,
  writeAboutStoryLogic,
} from '../src/pipeline/admin-logic'
import { readPhoto } from '../src/pipeline/photo-store'

const KEY = 'ztest-aboutville'
const CONTENT_DIR = path.join(process.cwd(), 'content')
const draftPath = (key: string) => path.join(CONTENT_DIR, '_drafts', `${key}.json`)
const cityPath = (key: string) => path.join(CONTENT_DIR, `${key}.json`)
const progressPath = (key: string) => path.join(CONTENT_DIR, '_drafts', `${key}.progress.json`)
const PHOTOS = path.join(process.cwd(), 'public', 'photos', KEY)
// a 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

async function exists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

afterAll(async () => {
  await rm(draftPath(KEY), { force: true })
  await rm(cityPath(KEY), { force: true })
  await rm(progressPath(KEY), { force: true })
  await rm(PHOTOS, { recursive: true, force: true })
  revalidateCity(KEY)
})

describe('about photos on a draft', () => {
  it('stores the file (bucket or public/photos/<key>), records it, recaptions it, and removes both again', async () => {
    const created = await createDraftFromFields({ city: 'Ztest Aboutville', state: 'MN', phone: '(612) 555-0142', crewLead: 'Maria', servingSince: '2024-03' })
    expect(created).toEqual({ ok: true, key: KEY })
    if (!created.ok) return
    expect(created.key).toBe(KEY)

    const added = await addPhotoLogic(KEY, { bytes: new Uint8Array(PNG), name: 'Crew Photo.png', type: 'image/png', alt: 'The crew' })
    expect(added).toEqual({ ok: true })
    let market = await readMarketLogic(KEY)
    expect(market.ok && market.ops?.photos?.length).toBe(1)
    const stored = market.ok ? market.ops!.photos![0] : undefined
    expect(stored?.path).toMatch(new RegExp(`^/photos/${KEY}/\\d+-crew-photo\\.webp$`))
    expect((await readPhoto(stored!.path))?.contentType).toBe('image/webp')

    expect(await savePhotoCaptionsLogic(KEY, { [stored!.path]: ' Maria and the crew ' })).toEqual({ ok: true })
    market = await readMarketLogic(KEY)
    expect(market.ok && market.ops?.photos?.[0].alt).toBe('Maria and the crew')

    expect(await addPhotoLogic(KEY, { bytes: new Uint8Array(PNG), name: 'x.gif', type: 'image/gif', alt: 'x' })).toEqual({ ok: true })
    // a real PNG is accepted whatever the browser called it; bytes that are not an image are refused whatever they are called
    expect(await addPhotoLogic(KEY, { bytes: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'), name: 'x.png', type: 'image/png', alt: 'x' })).toEqual({
      ok: false,
      error: '"x.png" is not a JPG, PNG or WebP image',
    })
    expect((await removePhotoLogic(KEY, '/photos/other-city/1-x.png')).ok).toBe(false)

    // with a serving-since year and a photo the story can be written; the stub stands in for the model
    process.env.STUB_MODEL = '1'
    expect(await writeAboutStoryLogic(KEY)).toEqual({ ok: true })
    delete process.env.STUB_MODEL
    market = await readMarketLogic(KEY)
    expect(market.ok && market.story).toHaveLength(2)
    expect(await removeAboutStoryLogic(KEY)).toEqual({ ok: true })
    market = await readMarketLogic(KEY)
    expect(market.ok && market.story).toBeUndefined()

    for (const photo of market.ok ? (market.ops?.photos ?? []) : []) expect(await removePhotoLogic(KEY, photo.path)).toEqual({ ok: true })
    expect(await exists(path.join(process.cwd(), 'public', stored!.path))).toBe(false)
    expect(await readPhoto(stored!.path)).toBeNull()
    market = await readMarketLogic(KEY)
    expect(market.ok && market.ops?.photos).toBeUndefined()
  }, 60_000) // several round trips to the bucket when Backblaze is configured
})
