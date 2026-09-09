import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { z } from 'zod'
import {
  ServiceCopySchema,
  FrontSectionsSchema,
  ResearchSchema,
} from '../src/pipeline/schemas'
import {
  AnthropicModelClient,
  StubModelClient,
  MODELS,
  SEARCH_BUDGET,
  makeClient,
  searchQuery,
  type ResearchEvent,
} from '../src/pipeline/model'

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
        neighbors: [],
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

describe('ServiceCopySchema', () => {
  const valid = { local: 'What changes here...', links: [] }

  test('accepts a valid example', () => {
    expect(ServiceCopySchema.parse(valid)).toEqual(valid)
  })

  test('rejects an extra key', () => {
    expect(() => ServiceCopySchema.parse({ ...valid, extra: 'nope' })).toThrow()
  })

  test('rejects a wrong-typed field', () => {
    expect(() => ServiceCopySchema.parse({ local: 42 })).toThrow()
  })

  test('rejects a missing key', () => {
    expect(() => ServiceCopySchema.parse({})).toThrow()
  })
})

describe('StubModelClient', () => {
  test('generate returns canned data validated through the schema', async () => {
    const canned = { local: 'Stubville deep cleaning removes years of buildup.', links: [] }
    const client = new StubModelClient({
      research: {},
      generated: { 'service.deep-cleaning': canned },
    })

    const result = await client.generate({ schema: ServiceCopySchema, system: 's', prompt: 'p', key: 'service.deep-cleaning' })

    expect(result).toEqual(canned)
  })

  test('generate rejects malformed canned data with a ZodError', async () => {
    const client = new StubModelClient({
      research: {},
      generated: { 'service.deep-cleaning': { local: 42 } },
    })

    await expect(
      client.generate({ schema: ServiceCopySchema, system: 's', prompt: 'p', key: 'service.deep-cleaning' })
    ).rejects.toBeInstanceOf(z.ZodError)
  })

  test('generate throws an Error naming the missing key', async () => {
    const client = new StubModelClient({ research: {}, generated: {} })

    await expect(
      client.generate({ schema: ServiceCopySchema, system: 's', prompt: 'p', key: 'service.deep-cleaning' })
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

  describe('research runs as three small passes on the cheaper model', () => {
    test('each pass has its own small search budget, so no pass can starve another', () => {
      expect(SEARCH_BUDGET.metro).toBeGreaterThanOrEqual(2)
      expect(SEARCH_BUDGET.areas).toBeGreaterThanOrEqual(1)
      expect(SEARCH_BUDGET.area).toBeGreaterThanOrEqual(1)
      // one long call let search results pile up in context; the whole point is that no pass is big
      for (const n of Object.values(SEARCH_BUDGET)) expect(n).toBeLessThanOrEqual(4)
    })

    test('research is transcription and runs on Sonnet; every sentence a reader sees is written by Opus', () => {
      expect(MODELS.research).toMatch(/sonnet/)
      expect(MODELS.writing).toMatch(/opus/)
    })
  })

  describe('searchQuery — what the operator sees while research runs', () => {
    /*
     * The research stage is the longest in the pipeline (~3 minutes, ~106K
     * input tokens) and the only one that streams progress. A real Orlando run
     * logged 27 events, EVERY one of them the generic "Searching the web…"
     * fallback — so the screen showed three identical lines for three minutes,
     * which is indistinguishable from a hang.
     *
     * The cause was that the query was only ever read from accumulated
     * input_json_delta text, and that accumulation came back empty or partial.
     * Nothing tested it because the streaming path needs a live API call.
     * Extracting the parse is what makes it testable.
     */
    test('reads the query from an already-parsed input object', () => {
      // The shape when the stream delivers input on content_block_start.
      expect(searchQuery({ query: 'orlando fl master planned communities' })).toBe(
        'orlando fl master planned communities',
      )
    })

    test('reads the query from accumulated JSON text', () => {
      // The shape when input arrives as input_json_delta fragments.
      expect(searchQuery('{"query":"lake nona housing stock"}')).toBe('lake nona housing stock')
    })

    test('returns null for the empty accumulation that caused the bug', () => {
      expect(searchQuery('')).toBeNull()
      expect(searchQuery(undefined)).toBeNull()
      expect(searchQuery(null)).toBeNull()
    })

    test('returns null for partial JSON rather than throwing', () => {
      // A content_block_stop can arrive before the fragments finish.
      expect(searchQuery('{"query":"orlando f')).toBeNull()
    })

    test('returns null when there is no query field, or it is not a string', () => {
      expect(searchQuery({ other: 'thing' })).toBeNull()
      expect(searchQuery({ query: 42 })).toBeNull()
      expect(searchQuery({ query: '   ' })).toBeNull()
    })

    test('trims, so a padded query does not render with leading space', () => {
      expect(searchQuery({ query: '  orlando suburbs  ' })).toBe('orlando suburbs')
    })
  })

  test('StubModelClient replays canned research events through onEvent, in order', async () => {
    const fixtures = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'))
    const client = new StubModelClient(fixtures)
    const seen: ResearchEvent[] = []
    await client.research('any prompt', 'research.metro', (e) => seen.push(e))
    expect(seen).toEqual(fixtures.events['research.metro'])
  })

  test('StubModelClient research works with no onEvent (backwards compatible)', async () => {
    const fixtures = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf-8'))
    const client = new StubModelClient(fixtures)
    await expect(client.research('any prompt', 'research.metro')).resolves.toBeTypeOf('string')
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
    await expect(client.research('prompt', 'research.metro')).resolves.toMatch(/Stubville/)
    // The committed fixture's service copy is about the stub metro; assert it
    // came from the fixture rather than pinning one city name in the prose.
    const svc = await client.generate({
      schema: ServiceCopySchema,
      system: 's',
      prompt: 'p',
      key: 'service.deep-cleaning',
    })
    expect(svc.local).toMatch(/Fixture City/)
  })

  test('falls through to AnthropicModelClient when STUB_MODEL is unset, which throws without an API key', () => {
    delete process.env.STUB_MODEL
    delete process.env.ANTHROPIC_API_KEY

    expect(() => makeClient()).toThrow(/ANTHROPIC_API_KEY/)
  })
})
