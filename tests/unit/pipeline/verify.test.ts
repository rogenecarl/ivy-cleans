import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { rm } from 'node:fs/promises'
import { loadDraft, saveDraft } from '@/server/content/drafts'
import { StubModelClient, type GenerateArgs } from '@/server/pipeline/model'
import { StubGeocoder, type Geocoder, type GeoPoint } from '@/server/pipeline/geo'
import { runStage, stageSlots } from '@/server/pipeline/stages'
import { requiredSlotsFor } from '@/server/content/drafts'
import type { ResearchClaim } from '@/server/pipeline/claims'
import { KEY, draftPath, fixtures, loadFixtures, newClient, progressPath, resetDraft } from './helpers'

const NORTH = 'house-cleaning-north-stubville'
type Verdict = 'supported' | 'unclear' | 'contradicted'

beforeAll(loadFixtures)
afterAll(async () => {
  await rm(draftPath(KEY), { force: true })
  await rm(progressPath(KEY), { force: true })
})

async function researched(): Promise<ResearchClaim[]> {
  await resetDraft()
  await runStage(newClient(), KEY, 'research')
  return (await loadDraft(KEY)).claims!
}

// a stub whose verify.<item> answers every pending claim of that item, with overrides by claim text
function clientFor(claims: ResearchClaim[], overrides: Record<string, Verdict> = {}) {
  const generated: Record<string, unknown> = { ...fixtures.generated }
  const items = new Set(claims.filter((c) => c.status === 'pending').map((c) => c.area ?? '_city'))
  for (const item of items) {
    generated[`verify.${item}`] = {
      verdicts: claims
        .filter((c) => c.status === 'pending' && (c.area ?? '_city') === item && c.kind !== 'zip')
        .map((c) => ({ id: c.id, verdict: overrides[c.text] ?? 'supported', reason: `reason for ${c.text}` })),
    }
  }
  const prompts: string[] = []
  const inner = new StubModelClient({ research: fixtures.research, generated })
  return {
    prompts,
    client: {
      usage: inner.usage,
      research: inner.research.bind(inner),
      generate<T>(args: GenerateArgs<T>) {
        prompts.push(args.prompt)
        return inner.generate(args)
      },
    },
  }
}

const statusOf = async (text: string) => (await loadDraft(KEY)).claims!.find((c) => c.text === text)?.status

describe('the verify stage', () => {
  beforeEach(async () => {
    await rm(draftPath(KEY), { force: true })
  })

  it('maps the check: supported → confirmed, unclear → unconfirmed, contradicted → wrong', async () => {
    const claims = await researched()
    const { client } = clientFor(claims, { 'Mock Meadows': 'unclear', 'Fixture Court': 'contradicted' })
    await runStage(client, KEY, 'verify', NORTH, new StubGeocoder({}))
    expect(await statusOf('Assertion Acres')).toBe('confirmed')
    expect(await statusOf('Mock Meadows')).toBe('unconfirmed')
    expect(await statusOf('Fixture Court')).toBe('wrong')
    const draft = await loadDraft(KEY)
    expect(draft.claims!.find((c) => c.text === 'Mock Meadows')?.reason).toBe('reason for Mock Meadows')
    const north = draft.research!.suburbs.find((s) => s.slug === NORTH)!
    expect(north.subdivisions).not.toContain('Mock Meadows')
    expect(north.subdivisions).not.toContain('Fixture Court')
    expect(north.subdivisions).toContain('Assertion Acres')
  })

  it('a place the map finds 60 miles away stays unconfirmed even when the source supports it', async () => {
    const claims = await researched()
    const far: GeoPoint = { lat: 45.56, lon: -94.16, state: 'MN' }
    const city: GeoPoint = { lat: 44.9778, lon: -93.265, state: 'MN' }
    const geocoder = new StubGeocoder({
      'Ztest Stubville, MN': city,
      'Assertion Acres, North Stubville, MN': far,
    })
    await runStage(clientFor(claims).client, KEY, 'verify', NORTH, geocoder)
    const claim = (await loadDraft(KEY)).claims!.find((c) => c.text === 'Assertion Acres')!
    expect(claim.status).toBe('unconfirmed')
    expect(claim.reason).toMatch(/miles/)
  })

  it('a geocoder that fails leaves the verdict to the source check', async () => {
    const claims = await researched()
    const broken: Geocoder = { locate: async () => Promise.reject(new Error('429')) }
    await runStage(clientFor(claims).client, KEY, 'verify', NORTH, broken)
    expect(await statusOf('Assertion Acres')).toBe('confirmed')
  })

  it('never sends a condition that is not printed to the check', async () => {
    const claims = await researched()
    const { client, prompts } = clientFor(claims)
    await runStage(client, KEY, 'verify', '_city', new StubGeocoder({}))
    expect(prompts.join('\n')).not.toContain('placeholder parcel risk')
    expect(prompts.join('\n')).toContain('Six months of test season')
  })

  it('checks ZIPs in code against the Census table, with no model call for them', async () => {
    const claims = await researched()
    const { client, prompts } = clientFor(claims)
    await runStage(client, KEY, 'verify', '_city', new StubGeocoder({}))
    const zips = (await loadDraft(KEY)).claims!.filter((c) => c.kind === 'zip')
    expect(zips.map((c) => c.status)).toEqual(['confirmed', 'confirmed'])
    expect(prompts.join('\n')).not.toContain('55401')
  })

  it('is done once every item is checked, and the run reached every item', async () => {
    const claims = await researched()
    const { client } = clientFor(claims)
    await runStage(client, KEY, 'verify', undefined, new StubGeocoder({}))
    const draft = await loadDraft(KEY)
    expect(draft.claims!.some((c) => c.status === 'pending')).toBe(false)
    expect(draft.done).toContain('verify')
  })

  it('marks a legacy draft (no claims) done with no model call', async () => {
    await researched()
    const draft = await loadDraft(KEY)
    delete draft.claims
    delete draft.researchFull
    await saveDraft(KEY, draft)
    const client = newClient()
    await runStage(client, KEY, 'verify', undefined, new StubGeocoder({}))
    expect(client.usage.calls).toBe(0)
    expect((await loadDraft(KEY)).done).toContain('verify')
  })

  it('owns no slots, so the stage-slot union still matches the required slots', async () => {
    await researched()
    const research = (await loadDraft(KEY)).research!
    expect(stageSlots(research).verify).toEqual([])
    expect(Object.values(stageSlots(research)).flat().sort()).toEqual([...requiredSlotsFor(research)].sort())
  })

  it('refuses copy that names a dropped place, and saves none of it', async () => {
    const claims = await researched()
    await runStage(clientFor(claims).client, KEY, 'verify', undefined, new StubGeocoder({}))
    const { researchFromClaims } = await import('@/server/pipeline/claims')
    const draft = await loadDraft(KEY)
    draft.claims!.find((c) => c.text === 'Assertion Acres')!.status = 'dropped'
    draft.research = researchFromClaims(draft.researchFull!, draft.claims!)
    await saveDraft(KEY, draft)

    await expect(runStage(newClient(), KEY, 'suburb', NORTH, new StubGeocoder({}))).rejects.toThrow(
      /names "Assertion Acres", which was not confirmed/,
    )
    expect((await loadDraft(KEY)).sections[`suburb.${NORTH}.homes`]).toBeUndefined()
  })
})
