// Research runs one step per request on the live site: Vercel stops a request long before a whole city is researched.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { rm } from 'node:fs/promises'
import { loadDraft } from '@/server/content/drafts'
import { revalidateCity } from '@/server/content/store'
import { pendingResearchItems, runStage } from '@/server/pipeline/stages'
import { pendingItemsLogic, regenerateLogic } from '@/server/pipeline/admin-logic'
import { KEY, cityPath, draftPath, loadFixtures, newClient, progressPath, resetDraft } from './helpers'

const pending = async () => pendingResearchItems(await loadDraft(KEY)).map((i) => i.slug)

// what the browser does: ask what is owed, run the first thing, ask again
async function walk(): Promise<string[][]> {
  const requests: string[][] = []
  for (let next = await pending(); next.length > 0; next = await pending()) {
    const client = newClient()
    await runStage(client, KEY, 'research', next[0])
    requests.push(client.calls)
  }
  return requests
}

describe('research, one step per request', () => {
  beforeAll(loadFixtures)
  beforeEach(resetDraft)
  afterAll(async () => {
    await rm(draftPath(KEY), { force: true })
    await rm(cityPath(KEY), { force: true })
    await rm(progressPath(KEY), { force: true })
    revalidateCity(KEY)
  })

  it('owes the metro pass, the area pass and the area list before it knows the areas', async () => {
    expect(await pending()).toEqual(['metro', 'areas', 'area-list'])
  })

  it('never makes more than one model call in a request', async () => {
    const requests = await walk()
    expect(requests.length).toBeGreaterThan(4)
    for (const calls of requests) expect(calls).toHaveLength(1)
  })

  it('a single step does not mark research done', async () => {
    await runStage(newClient(), KEY, 'research', 'metro')
    const draft = await loadDraft(KEY)
    expect(draft.done).not.toContain('research')
    expect(draft.research).toBeUndefined()
    expect(await pending()).toEqual(['areas', 'area-list'])
  })

  it('lists every area, then structuring, once the area list exists', async () => {
    await runStage(newClient(), KEY, 'research', 'metro')
    await runStage(newClient(), KEY, 'research', 'areas')
    await runStage(newClient(), KEY, 'research', 'area-list')
    const next = await pending()
    expect(next.at(-1)).toBe('structure')
    expect(next.slice(0, -1).every((slug) => slug.startsWith('area:'))).toBe(true)
    expect(next.length).toBeGreaterThan(1)
  })

  it('finishing the last step completes the stage with the same research as one long run', async () => {
    await walk()
    const stepped = await loadDraft(KEY)
    expect(stepped.done).toContain('research')

    await resetDraft()
    await runStage(newClient(), KEY, 'research')
    const whole = await loadDraft(KEY)
    expect(stepped.research).toEqual(whole.research)
    expect(stepped.claims).toEqual(whole.claims)
    expect(stepped.sources).toEqual(whole.sources)
  })

  it('a step already finished costs nothing when it is repeated', async () => {
    await runStage(newClient(), KEY, 'research', 'metro')
    const again = newClient()
    await runStage(again, KEY, 'research', 'metro')
    expect(again.calls).toEqual([])
  })

  it('refuses a step it does not know, and structuring before the areas are in', async () => {
    await expect(runStage(newClient(), KEY, 'research', 'area:nowhere')).rejects.toThrow('nowhere')
    await expect(runStage(newClient(), KEY, 'research', 'structure')).rejects.toThrow('structure')
  })

  it('the console asks for the steps, by name', async () => {
    const result = await pendingItemsLogic(KEY, 'research')
    expect(result.ok && result.items.map((i) => i.slug)).toEqual(['metro', 'areas', 'area-list'])
    expect(result.ok && result.items.every((i) => i.name !== '')).toBe(true)
  })

  it('regenerating from the console only clears: the browser walks the steps', async () => {
    await walk()
    await runStage(newClient(), KEY, 'verify')
    const result = await regenerateLogic(KEY, 'research')
    expect(result.ok).toBe(true)
    const draft = await loadDraft(KEY)
    expect(draft.done).toEqual([])
    expect(draft.researchParts).toBeUndefined()
    expect(draft.researchAreaNames).toBeUndefined()
    expect(await pending()).toEqual(['metro', 'areas', 'area-list'])
  })
})
