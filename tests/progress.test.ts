import { afterEach, describe, expect, it } from 'vitest'
import { rm, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { appendProgress, readProgress, clearProgress, PROGRESS_CAP } from '../src/pipeline/progress'

const FILE = path.join(process.cwd(), 'content/_drafts/progress-spec.progress.json')

afterEach(async () => {
  await rm(FILE, { force: true })
})

describe('progress log', () => {
  it('returns [] for a missing file', async () => {
    expect(await readProgress('progress-spec')).toEqual([])
  })

  it('appends events with an ISO timestamp and reads them back in order', async () => {
    await appendProgress('progress-spec', { stage: 'research', kind: 'start', label: 'a' })
    await appendProgress('progress-spec', { stage: 'research', kind: 'search', label: 'b' })
    const events = await readProgress('progress-spec')
    expect(events.map((e) => e.label)).toEqual(['a', 'b'])
    expect(new Date(events[0].at).toString()).not.toBe('Invalid Date')
  })

  it('serializes concurrent appends — none are lost', async () => {
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        appendProgress('progress-spec', { stage: 'research', kind: 'search', label: `q${i}` })
      )
    )
    expect((await readProgress('progress-spec')).length).toBe(25)
  })

  it('caps the log at PROGRESS_CAP most-recent events', async () => {
    const events = Array.from({ length: PROGRESS_CAP + 5 }, (_, i) => ({
      at: new Date().toISOString(), stage: 'research', kind: 'search' as const, label: `q${i}`,
    }))
    await mkdir(path.dirname(FILE), { recursive: true })
    await writeFile(FILE, JSON.stringify(events), 'utf-8')
    await appendProgress('progress-spec', { stage: 'front', kind: 'start', label: 'last' })
    const read = await readProgress('progress-spec')
    expect(read.length).toBe(PROGRESS_CAP)
    expect(read[read.length - 1].label).toBe('last')
  })

  it('returns [] for a corrupt file instead of throwing', async () => {
    await mkdir(path.dirname(FILE), { recursive: true })
    await writeFile(FILE, 'not json', 'utf-8')
    expect(await readProgress('progress-spec')).toEqual([])
  })

  it('clearProgress(key, stage) removes only that stage’s events', async () => {
    await appendProgress('progress-spec', { stage: 'research', kind: 'start', label: 'r' })
    await appendProgress('progress-spec', { stage: 'front', kind: 'start', label: 'f' })
    await clearProgress('progress-spec', 'research')
    expect((await readProgress('progress-spec')).map((e) => e.stage)).toEqual(['front'])
  })

  it('clearProgress(key) removes the whole file', async () => {
    await appendProgress('progress-spec', { stage: 'research', kind: 'start', label: 'r' })
    await clearProgress('progress-spec')
    expect(await readProgress('progress-spec')).toEqual([])
  })

  it('rejects an invalid key', async () => {
    await expect(appendProgress('Bad Key!', { stage: 'research', kind: 'start', label: 'x' }))
      .rejects.toThrow(/invalid/)
  })
})
