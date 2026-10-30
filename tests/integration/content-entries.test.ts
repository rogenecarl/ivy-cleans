import { afterAll, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/server/infra/db'
import { deleteEntry, listEntryKeys, readEntry, writeEntry } from '@/server/content/entries'

const KEY = 'ztest-content-entry'

describe('ContentEntry against real Postgres', () => {
  vi.stubEnv('CONTENT_STORE', 'db')

  afterAll(async () => {
    await prisma.contentEntry.deleteMany({ where: { key: { startsWith: 'ztest-' } } })
    vi.unstubAllEnvs()
  })

  it('writes, reads, overwrites, lists and deletes a draft', async () => {
    await writeEntry('draft', KEY, { facts: { city: 'Ztest' }, sections: { a: ['b'] } })
    expect(await readEntry('draft', KEY)).toEqual({ facts: { city: 'Ztest' }, sections: { a: ['b'] } })
    await writeEntry('draft', KEY, { done: ['research'] })
    expect(await readEntry('draft', KEY)).toEqual({ done: ['research'] })
    expect(await listEntryKeys('draft')).toContain(KEY)

    await deleteEntry('draft', KEY)
    expect(await readEntry('draft', KEY)).toBeNull()
    expect(await listEntryKeys('draft')).not.toContain(KEY)

    await writeEntry('draft', KEY, { back: true })
    expect(await readEntry('draft', KEY)).toEqual({ back: true })
  }, 60_000)
})
