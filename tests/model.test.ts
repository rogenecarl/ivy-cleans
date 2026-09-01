import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { z } from 'zod'
import {
  DeepSchema,
  FrontSectionsSchema,
  ResearchSchema,
} from '../src/pipeline/schemas'
import { AnthropicModelClient, StubModelClient, makeClient, type ResearchEvent } from '../src/pipeline/model'

// NOTE: this file must never instantiate a *working* AnthropicModelClient
// (real apiKey + a call that would hit the network). Every AnthropicModelClient
// test below only exercises the constructor's synchronous throw path.

// Real committed fixture (tests/fixtures/stub-pipeline.json) — see the comment
// on the `makeClient` describe block below for why tests read this file
// in place rather than writing their own throwaway copies.
const FIXTURE_PATH = path.join(process.cwd(), 'tests/fixtures/stub-pipeline.json')

describe('ResearchSchema', () => {
  const valid = {
    suburbs: [
      {
        name: 'Edina',
        slug: 'edina',
        subdivisions: ['Interlachen'],
        housingCharacter: 'Mid-century ramblers and newer infill construction.',
        conditions: [{ condition: 'Hard water', implication: 'Faucets need descaling.', copySafe: true }],
      },
    ],
    conditions: [{ condition: 'Cold winters', implication: 'Salt tracked indoors.', copySafe: true }],
    zips: ['55401'],
    keywords: ['house cleaning minneapolis'],
  }

  test('accepts a valid example', () => {
    expect(ResearchSchema.parse(valid)).toEqual(valid)
  })

  test('rejects an extra top-level key', () => {
    expect(() => ResearchSchema.parse({ ...valid, notes: 'extra' })).toThrow()
  })

  test('rejects an extra key inside a suburb object', () => {
    expect(() =>
      ResearchSchema.parse({
        ...valid,
        suburbs: [{ ...valid.suburbs[0], population: 100 }],
      })
    ).toThrow()
  })

  test('rejects a wrong-typed field', () => {
    expect(() => ResearchSchema.parse({ ...valid, zips: [55401] })).toThrow()
  })

  test('rejects a missing key', () => {
    const missingKeywords = { suburbs: valid.suburbs, zips: valid.zips, conditions: valid.conditions }
    expect(() => ResearchSchema.parse(missingKeywords)).toThrow()
  })
})

describe('FrontSectionsSchema', () => {
  const valid = {
    heroParagraphs: ['We clean homes across the metro.'],
    serviceIntro: ['Every visit follows the same checklist.'],
    cards: {
      dusting: 'Dusting copy',
      vacuuming: 'Vacuuming copy',
      bathroom: 'Bathroom copy',
      window: 'Window copy',
      upholstery: 'Upholstery copy',
    },
  }

  test('accepts a valid example', () => {
    expect(FrontSectionsSchema.parse(valid)).toEqual(valid)
  })

  test('rejects an extra top-level key', () => {
    expect(() => FrontSectionsSchema.parse({ ...valid, extra: true })).toThrow()
  })

  test('rejects an extra key inside cards', () => {
    expect(() =>
      FrontSectionsSchema.parse({ ...valid, cards: { ...valid.cards, floors: 'extra' } })
    ).toThrow()
  })

  test('rejects a wrong-typed field', () => {
    expect(() => FrontSectionsSchema.parse({ ...valid, heroParagraphs: 'not-an-array' })).toThrow()
  })

  test('rejects a missing key inside cards', () => {
    const missingUpholstery = {
      dusting: valid.cards.dusting,
      vacuuming: valid.cards.vacuuming,
      bathroom: valid.cards.bathroom,
      window: valid.cards.window,
    }
    expect(() => FrontSectionsSchema.parse({ ...valid, cards: missingUpholstery })).toThrow()
  })
})

describe('DeepSchema', () => {
  const valid = { whatIs: 'Deep cleaning is...' }

  test('accepts a valid example', () => {
    expect(DeepSchema.parse(valid)).toEqual(valid)
  })

  test('rejects an extra key', () => {
    expect(() => DeepSchema.parse({ ...valid, extra: 'nope' })).toThrow()
  })

  test('rejects a wrong-typed field', () => {
    expect(() => DeepSchema.parse({ whatIs: 42 })).toThrow()
  })

  test('rejects a missing key', () => {
    expect(() => DeepSchema.parse({})).toThrow()
  })
})

describe('StubModelClient', () => {
  test('generate returns canned data validated through the schema', async () => {
    const canned = { whatIs: 'Stubville deep cleaning removes years of buildup.' }
    const client = new StubModelClient({ research: {}, generated: { deep: canned } })

    const result = await client.generate({ schema: DeepSchema, system: 's', prompt: 'p', key: 'deep' })

    expect(result).toEqual(canned)
  })

  test('generate rejects malformed canned data with a ZodError', async () => {
    const client = new StubModelClient({
      research: {},
      generated: { deep: { whatIs: 42 } },
    })

    await expect(
      client.generate({ schema: DeepSchema, system: 's', prompt: 'p', key: 'deep' })
    ).rejects.toBeInstanceOf(z.ZodError)
  })

  test('generate throws an Error naming the missing key', async () => {
    const client = new StubModelClient({ research: {}, generated: {} })

    await expect(
      client.generate({ schema: DeepSchema, system: 's', prompt: 'p', key: 'deep' })
    ).rejects.toThrow(/deep/)
  })

  test('research returns the canned string for the key', async () => {
    const client = new StubModelClient({
      research: { front: 'Stubville findings: 12 suburbs, 5 landmarks.' },
      generated: {},
    })

    await expect(client.research('prompt text', 'front')).resolves.toBe(
      'Stubville findings: 12 suburbs, 5 landmarks.'
    )
  })

  test('research throws an Error naming the missing key', async () => {
    const client = new StubModelClient({ research: {}, generated: {} })

    await expect(client.research('prompt text', 'missing-stage')).rejects.toThrow(/missing-stage/)
  })

  test('StubModelClient replays canned research events through onEvent, in order', async () => {
    const fixtures = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'))
    const client = new StubModelClient(fixtures)
    const seen: ResearchEvent[] = []
    await client.research('any prompt', 'research', (e) => seen.push(e))
    expect(seen).toEqual(fixtures.events.research)
  })

  test('StubModelClient research works with no onEvent (backwards compatible)', async () => {
    const fixtures = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'))
    const client = new StubModelClient(fixtures)
    await expect(client.research('any prompt', 'research')).resolves.toBeTypeOf('string')
  })
})

describe('AnthropicModelClient constructor', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey
    }
  })

  test('throws a clear error when ANTHROPIC_API_KEY is missing and no key is passed', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(() => new AnthropicModelClient()).toThrow(/ANTHROPIC_API_KEY/)
  })

  test('constructs without throwing when an explicit apiKey is passed (no network call made)', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(() => new AnthropicModelClient('sk-ant-test-not-a-real-key')).not.toThrow()
  })
})

describe('makeClient', () => {
  // Reads the REAL committed fixture (tests/fixtures/stub-pipeline.json, added
  // in Task 4) rather than writing a throwaway one: makeClient hardcodes that
  // path, so any test that created/removed the file there would clobber the
  // fixture the pipeline suite depends on — and could do so mid-run, since
  // vitest executes test files in parallel. Nothing here touches the disk.
  const fixturePath = FIXTURE_PATH
  const originalStubModel = process.env.STUB_MODEL
  const originalApiKey = process.env.ANTHROPIC_API_KEY

  afterEach(() => {
    if (originalStubModel === undefined) {
      delete process.env.STUB_MODEL
    } else {
      process.env.STUB_MODEL = originalStubModel
    }
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey
    }
  })

  test('returns a StubModelClient wired to the committed fixture when STUB_MODEL=1', async () => {
    expect(fs.existsSync(fixturePath)).toBe(true)
    process.env.STUB_MODEL = '1'

    const client = makeClient()

    expect(client).toBeInstanceOf(StubModelClient)
    await expect(client.research('prompt', 'research')).resolves.toMatch(/Stubville/)
    const deep = await client.generate({ schema: DeepSchema, system: 's', prompt: 'p', key: 'deep' })
    expect(deep.whatIs).toMatch(/Stubville/)
  })

  test('falls through to AnthropicModelClient when STUB_MODEL is unset, which throws without an API key', () => {
    delete process.env.STUB_MODEL
    delete process.env.ANTHROPIC_API_KEY

    expect(() => makeClient()).toThrow(/ANTHROPIC_API_KEY/)
  })
})
