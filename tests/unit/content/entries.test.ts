import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// in-memory stand-in for the ContentEntry table
const rows = new Map<string, { data: unknown; deleted: boolean }>()
let failing = false
const check = () => {
  if (failing) throw new Error('database unreachable')
}

vi.mock('@/server/content/db-store', () => ({
  readRow: async (kind: string, key: string) => {
    check()
    return rows.get(`${kind}/${key}`) ?? null
  },
  writeRow: async (kind: string, key: string, data: unknown) => {
    check()
    rows.set(`${kind}/${key}`, { data, deleted: false })
  },
  deleteRow: async (kind: string, key: string) => {
    check()
    rows.set(`${kind}/${key}`, { data: {}, deleted: true })
  },
  listRows: async (kind: string) => {
    check()
    return [...rows.entries()]
      .filter(([id]) => id.startsWith(`${kind}/`))
      .map(([id, row]) => ({ key: id.slice(kind.length + 1), deleted: row.deleted }))
  },
}))

import { deleteEntry, listEntryKeys, readEntry, usesDatabase, writeEntry } from '@/server/content/entries'
import { getCity, listLiveCityKeys, readCityDoc } from '@/server/content/store'

describe('usesDatabase', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('is files by default, the database on Vercel, and CONTENT_STORE overrides both', () => {
    vi.stubEnv('VERCEL', '')
    vi.stubEnv('CONTENT_STORE', '')
    expect(usesDatabase()).toBe(false)
    vi.stubEnv('VERCEL', '1')
    expect(usesDatabase()).toBe(true)
    vi.stubEnv('CONTENT_STORE', 'file')
    expect(usesDatabase()).toBe(false)
    vi.stubEnv('VERCEL', '')
    vi.stubEnv('CONTENT_STORE', 'db')
    expect(usesDatabase()).toBe(true)
  })
})

describe('database mode', () => {
  beforeEach(() => {
    rows.clear()
    failing = false
    vi.stubEnv('CONTENT_STORE', 'db')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('answers from the committed file when there is no row', async () => {
    const doc = (await readEntry('city', 'minneapolis')) as { city: string }
    expect(doc.city).toBe('Minneapolis')
  })

  it('prefers a row over the file', async () => {
    await writeEntry('city', 'minneapolis', { city: 'From the database' })
    expect(await readEntry('city', 'minneapolis')).toEqual({ city: 'From the database' })
  })

  it('a deleted entry stays deleted even though its file is still deployed', async () => {
    expect(await readEntry('draft', 'houston')).not.toBeNull()
    await deleteEntry('draft', 'houston')
    expect(await readEntry('draft', 'houston')).toBeNull()
    expect(await listEntryKeys('draft')).not.toContain('houston')
  })

  it('lists files and rows together', async () => {
    await writeEntry('draft', 'ztest-new', { facts: {} })
    const keys = await listEntryKeys('draft')
    expect(keys).toContain('ztest-new')
    expect(keys).toContain('houston')
  })

  it('a database failure throws for writers instead of looking like "nothing there"', async () => {
    failing = true
    await expect(readEntry('city', 'minneapolis')).rejects.toThrow('database unreachable')
    await expect(readCityDoc('minneapolis')).rejects.toThrow('database unreachable')
  })

  it('public reads survive a database failure on the committed file', async () => {
    failing = true
    expect((await getCity('minneapolis')).city).toBe('Minneapolis')
    expect(await listLiveCityKeys()).toContain('minneapolis')
  })

  it('never serves a process-cached city: another server may have changed it', async () => {
    const original = await getCity('minneapolis')
    await writeEntry('city', 'minneapolis', { ...original, phoneDisplay: '(000) 000-0000' })
    expect((await getCity('minneapolis')).phoneDisplay).toBe('(000) 000-0000')
  })
})
