// tests/admin-logic.test.ts
/*
 * The admin's behaviour, tested where it actually lives.
 *
 * src/app/admin/(console)/actions.ts carries the 'use server'
 * directive, which makes it a set of Next RPC endpoints rather than an
 * importable module — vitest cannot call it without standing up the framework.
 * So every decision the admin makes lives in src/pipeline/admin-logic.ts and
 * is exercised here directly; the actions file adds only redirect() and
 * revalidatePath() on top, and the first test below pins that separation by
 * proving admin-logic imports nothing from next/.
 *
 * NO live API calls: STUB_MODEL=1 is set for the whole file, so makeClient()
 * returns the StubModelClient reading tests/fixtures/stub-pipeline.json.
 *
 * All keys are prefixed `ztest-`; afterAll deletes their draft and content
 * files and restores content/_cities.json and content/_domains.json to the
 * bytes they had before the run.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  createDraftFromFields,
  finalizeLogic,
  getProgressLogic,
  isStageId,
  listCities,
  MAX_REVIEWS,
  MAX_REVIEWS_LENGTH,
  normalizeSuburbs,
  parseReviews,
  parseZips,
  pendingSuburbsLogic,
  publishLogic,
  regenerateLogic,
  runStageLogic,
  readOpsLogic,
  updateOpsLogic,
  updateSuburbsLogic,
} from '../src/pipeline/admin-logic'
import { loadDraft } from '../src/content/drafts'
import { getCity, revalidateCity } from '../src/content/store'
import { validateCityContent } from '../src/content/validate'
import { STAGE_IDS } from '../src/pipeline/stages'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const DRAFTS_DIR = path.join(CONTENT_DIR, '_drafts')
const CITIES_JSON = path.join(CONTENT_DIR, '_cities.json')
const DOMAINS_JSON = path.join(CONTENT_DIR, '_domains.json')

/** Every key this file may create; afterAll cleans all of them unconditionally. */
const KEYS = ['ztest-adminville', 'ztest-editville', 'ztest-opsville'] as const
const CITY_NAMES: Record<(typeof KEYS)[number], string> = {
  'ztest-adminville': 'Ztest Adminville',
  'ztest-editville': 'Ztest Editville',
  'ztest-opsville': 'Ztest Opsville',
}

function draftPath(key: string): string {
  return path.join(DRAFTS_DIR, `${key}.json`)
}
function cityPath(key: string): string {
  return path.join(CONTENT_DIR, `${key}.json`)
}
function progressPath(key: string): string {
  return path.join(DRAFTS_DIR, `${key}.progress.json`)
}

async function wipe(key: string): Promise<void> {
  await rm(draftPath(key), { force: true })
  await rm(cityPath(key), { force: true })
  await rm(progressPath(key), { force: true })
  revalidateCity(key)
}

/** Fresh draft for `key`, with the same well-formed form input every time. */
async function freshDraft(key: (typeof KEYS)[number]) {
  await wipe(key)
  return createDraftFromFields({
    city: CITY_NAMES[key],
    state: 'mn',
    phone: '(612) 555-0142',
    address: '1 Fixture Way',
    notes: 'Stub branch — fixture data only.',
  })
}

// The suburb stage's generation is Task 16's work (see stages.ts executeStage)
// — until it lands, running "every stage" here means every stage that
// actually generates something, same as tests/pipeline.test.ts's
// RUNNABLE_STAGES.
const RUNNABLE_STAGE_IDS = STAGE_IDS.filter((id) => id !== 'suburb')

async function runAllStages(key: string): Promise<void> {
  for (const stage of RUNNABLE_STAGE_IDS) {
    const result = await runStageLogic(key, stage)
    expect(result).toEqual({ ok: true })
  }
}

let citiesSnapshot: string
let domainsSnapshot: string
let priorStubModel: string | undefined

beforeAll(async () => {
  priorStubModel = process.env.STUB_MODEL
  process.env.STUB_MODEL = '1'
  citiesSnapshot = await readFile(CITIES_JSON, 'utf-8')
  domainsSnapshot = await readFile(DOMAINS_JSON, 'utf-8')
})

afterAll(async () => {
  for (const key of KEYS) await wipe(key)
  await writeFile(CITIES_JSON, citiesSnapshot, 'utf-8')
  await writeFile(DOMAINS_JSON, domainsSnapshot, 'utf-8')

  if (priorStubModel === undefined) delete process.env.STUB_MODEL
  else process.env.STUB_MODEL = priorStubModel

  const { readdir } = await import('node:fs/promises')
  const content = await readdir(CONTENT_DIR)
  const drafts = await readdir(DRAFTS_DIR)
  for (const key of KEYS) {
    expect(content).not.toContain(`${key}.json`)
    expect(drafts).not.toContain(`${key}.json`)
    expect(drafts).not.toContain(`${key}.progress.json`)
  }
  // The two indexes must come out byte-identical, not merely key-equivalent:
  // they are statically imported into the proxy bundle.
  expect(await readFile(CITIES_JSON, 'utf-8')).toBe(citiesSnapshot)
  expect(await readFile(DOMAINS_JSON, 'utf-8')).toBe(domainsSnapshot)
})

describe('framework independence', () => {
  it('admin-logic imports nothing from next/ — which is why this file can import it', async () => {
    const source = await readFile(path.join(process.cwd(), 'src/pipeline/admin-logic.ts'), 'utf-8')
    // Anchored to a line-initial `import`, so the rule can be *described* in a
    // comment in that file without the description tripping this assertion.
    expect(source).not.toMatch(/^import[^\n]*['"]next(\/|['"])/m)
    expect(source).not.toMatch(/^[^\n]*require\(['"]next/m)
    // And the module really did load in a bare node environment:
    expect(typeof listCities).toBe('function')
    expect(typeof runStageLogic).toBe('function')
  })

  it('guards the stage id crossing the action boundary', () => {
    for (const stage of STAGE_IDS) expect(isStageId(stage)).toBe(true)
    expect(isStageId('nonsense')).toBe(false)
    expect(isStageId('__proto__')).toBe(false)
  })
})

describe('createDraftFromFields', () => {
  const KEY = 'ztest-adminville'

  beforeEach(async () => {
    await wipe(KEY)
  })

  it('derives the facts and writes the sidecar', async () => {
    const result = await createDraftFromFields({
      city: '  Ztest Adminville  ',
      state: 'mn',
      phone: '(612) 555-0142',
      address: '1 Fixture Way',
      notes: 'Stub branch — fixture data only.',
    })
    expect(result).toEqual({ ok: true, key: KEY })

    const draft = await loadDraft(KEY)
    expect(draft.facts).toMatchObject({
      city: 'Ztest Adminville',
      state: 'MN',
      stateName: 'Minnesota',
      phone: '612-555-0142',
      phoneDisplay: '(612) 555-0142',
      phoneHref: 'tel:6125550142',
      address: '1 Fixture Way',
      notes: 'Stub branch — fixture data only.',
    })
    expect(draft.done).toEqual([])
    expect(draft.sections).toEqual({})
  })

  it('strips whatever formatting the operator typed around the ten digits', async () => {
    const result = await createDraftFromFields({
      city: 'Ztest Adminville',
      state: 'MN',
      phone: ' 612.555.0142 ',
    })
    expect(result).toEqual({ ok: true, key: KEY })
    expect((await loadDraft(KEY)).facts.phoneHref).toBe('tel:6125550142')
  })

  it('omits blank optional fields rather than storing empty strings', async () => {
    await createDraftFromFields({
      city: 'Ztest Adminville',
      state: 'MN',
      phone: '6125550142',
      address: '   ',
      notes: '',
    })
    const { facts } = await loadDraft(KEY)
    expect(facts.address).toBeUndefined()
    expect(facts.notes).toBeUndefined()
  })

  it('returns the error instead of throwing it across the action boundary', async () => {
    const badPhone = await createDraftFromFields({
      city: 'Ztest Adminville',
      state: 'MN',
      phone: '612-555-014',
    })
    expect(badPhone.ok).toBe(false)
    expect(badPhone.ok === false && badPhone.error).toMatch(/10 digits/)

    const badState = await createDraftFromFields({
      city: 'Ztest Adminville',
      state: 'ZZ',
      phone: '6125550142',
    })
    expect(badState.ok).toBe(false)
    // Names the bad value AND both accepted forms: the operator can fix it
    // from the message without going to look up what the field wants.
    expect(badState.ok === false && badState.error).toMatch(/unrecognised state/)
    expect(badState.ok === false && badState.error).toMatch(/two-letter code.*full state name/)

    // Nothing was written by either failure.
    await expect(loadDraft(KEY)).rejects.toThrow(/unknown draft/)
  })

  it('refuses a second draft for a city that already has one', async () => {
    expect((await freshDraft(KEY)).ok).toBe(true)
    const again = await createDraftFromFields({
      city: 'Ztest Adminville',
      state: 'MN',
      phone: '6125550142',
    })
    expect(again).toEqual({ ok: false, error: 'a draft already exists for "ztest-adminville"' })
  })
})

describe('stage run → finalize → publish', () => {
  const KEY = 'ztest-adminville'

  beforeAll(async () => {
    expect((await freshDraft(KEY)).ok).toBe(true)
  })

  it('runs all three stages through the stub client', async () => {
    await runAllStages(KEY)
    const draft = await loadDraft(KEY)
    expect(draft.done).toEqual([...RUNNABLE_STAGE_IDS])
    expect(Object.keys(draft.sections)).toHaveLength(8)
    expect(draft.research?.zips).toEqual(['00001', '00002'])
  })

  // Task 18: finalizeLogic (below) now requires every surviving area's three
  // suburb.<slug>.* slots, so the shared KEY draft the rest of this describe
  // builds on needs the suburb stage run too, not just the three
  // RUNNABLE_STAGE_IDS above.
  it('runs the suburb stage too, completing every stage the pipeline defines', async () => {
    expect(await runStageLogic(KEY, 'suburb')).toEqual({ ok: true })
    const draft = await loadDraft(KEY)
    expect(draft.done).toEqual(STAGE_IDS)
  })

  it('is a no-op on a stage that already ran', async () => {
    const before = JSON.stringify(await loadDraft(KEY))
    expect(await runStageLogic(KEY, 'front')).toEqual({ ok: true })
    expect(JSON.stringify(await loadDraft(KEY))).toBe(before)
  })

  it('surfaces a stage failure as a message, not an exception', async () => {
    // 'research' has not run for this key, so 'deep' has nothing to consume.
    await wipe('ztest-editville')
    await freshDraft('ztest-editville')
    const result = await runStageLogic('ztest-editville', 'deep')
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toMatch(/research stage has not completed/)
  })

  it('finalizes into a valid, registered city document', async () => {
    expect(await finalizeLogic(KEY)).toEqual({ ok: true })

    const doc = validateCityContent(JSON.parse(await readFile(cityPath(KEY), 'utf-8')))
    expect(doc.city).toBe('Ztest Adminville')
    expect(doc.status).toBe('draft')
    expect(doc.phone).toBe('612-555-0142')
    expect(doc.research.conditions.map((c) => c.condition)).toEqual([
      'Six months of test season followed by six months of assertions',
      'Internal QA note — placeholder parcel risk data',
    ])

    const keys = JSON.parse(await readFile(CITIES_JSON, 'utf-8')) as string[]
    expect(keys).toContain(KEY)
    // The sidecar survives finalize — regenerate still has to work.
    await expect(loadDraft(KEY)).resolves.toBeDefined()
  })

  it('reports what is missing when a draft is finalized too early', async () => {
    const result = await finalizeLogic('ztest-editville')
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toMatch(/missing research/)
  })

  it('publishes: status live, host mapped lowercase, sidecar retired', async () => {
    expect(await publishLogic(KEY, 'Ztest-Admin.Example')).toEqual({ ok: true })

    const doc = await getCity(KEY)
    expect(doc.status).toBe('live')
    expect(doc.domain).toBe('ztest-admin.example')

    const domains = JSON.parse(await readFile(DOMAINS_JSON, 'utf-8')) as {
      hosts: Record<string, string>
    }
    expect(domains.hosts['ztest-admin.example']).toBe(KEY)

    await expect(loadDraft(KEY)).rejects.toThrow(/unknown draft/)
  })

  it('treats a blank domain field as "no domain"', async () => {
    // The publish form submits '' when the operator leaves the box empty; that
    // must not become a host entry keyed on the empty string.
    const before = JSON.parse(await readFile(DOMAINS_JSON, 'utf-8')) as {
      hosts: Record<string, string>
    }
    expect(await publishLogic(KEY, '   ')).toEqual({ ok: true })
    const after = JSON.parse(await readFile(DOMAINS_JSON, 'utf-8')) as {
      hosts: Record<string, string>
    }
    expect(Object.keys(after.hosts)).toEqual(Object.keys(before.hosts))
    expect(after.hosts['']).toBeUndefined()
  })
})

describe('normalizeSuburbs', () => {
  it('cleans slugs, fills a blank slug from the name, and drops empties and duplicates', () => {
    expect(
      normalizeSuburbs([
        { name: '  Mock Hollow ', slug: ' Cleaning-Services-Mock Hollow ' },
        { name: 'Mock Hollow Again', slug: 'cleaning--services--mock--hollow' },
        { name: 'Fixture Heights', slug: '' },
        { name: '', slug: 'nameless' },
        { name: 'Punctuation Only', slug: '!!!' },
      ]),
    ).toEqual([
      { name: 'Mock Hollow', slug: 'cleaning-services-mock-hollow' },
      { name: 'Fixture Heights', slug: 'fixture-heights' },
    ])
  })
})

describe('updateSuburbsLogic', () => {
  const KEY = 'ztest-editville'

  const EDITED = [
    { name: 'North Stubville', slug: 'House_Cleaning North Stubville' },
    { name: 'New Area', slug: '' },
  ]

  beforeEach(async () => {
    await freshDraft(KEY)
  })

  it('edits the draft sidecar when only a draft exists', async () => {
    expect(await runStageLogic(KEY, 'research')).toEqual({ ok: true })

    expect(await updateSuburbsLogic(KEY, EDITED)).toEqual({ ok: true })

    const draft = await loadDraft(KEY)
    expect(draft.research?.suburbs).toEqual([
      {
        name: 'North Stubville',
        slug: 'house-cleaning-north-stubville',
        subdivisions: [
          'Assertion Acres',
          'Mock Meadows',
          'Fixture Court',
          'Stub Village Estates',
          'Placeholder Heights',
          'Canned Creek',
        ],
        housingCharacter: 'Mock bungalows from the fixture era, mostly one story, with small fenced yards.',
        conditions: [],
      },
      { name: 'New Area', slug: 'new-area', subdivisions: [], housingCharacter: '', conditions: [] },
    ])
    // The rest of the research object is untouched.
    expect(draft.research?.zips).toEqual(['00001', '00002'])
  })

  it('edits the published document too, so the preview renders the change', async () => {
    await runAllStages(KEY)
    // Task 18: finalizeLogic now requires every surviving area's suburb
    // slots, so the suburb stage has to run before finalize can succeed.
    expect(await runStageLogic(KEY, 'suburb')).toEqual({ ok: true })
    expect(await finalizeLogic(KEY)).toEqual({ ok: true })

    expect(await updateSuburbsLogic(KEY, EDITED)).toEqual({ ok: true })

    // src/data/areas.ts maps research.suburbs off the city DOCUMENT, so this
    // is the copy the preview actually renders.
    const doc = await getCity(KEY)
    expect(doc.research.suburbs).toEqual([
      {
        name: 'North Stubville',
        slug: 'house-cleaning-north-stubville',
        subdivisions: [
          'Assertion Acres',
          'Mock Meadows',
          'Fixture Court',
          'Stub Village Estates',
          'Placeholder Heights',
          'Canned Creek',
        ],
        housingCharacter: 'Mock bungalows from the fixture era, mostly one story, with small fenced yards.',
        conditions: [],
      },
      { name: 'New Area', slug: 'new-area', subdivisions: [], housingCharacter: '', conditions: [] },
    ])
    // ...and the sidecar stayed in step, so a later regenerate/finalize does
    // not resurrect the old list.
    expect((await loadDraft(KEY)).research?.suburbs).toEqual(doc.research.suburbs)
  })

  it('refuses an empty list rather than publishing a city with no service areas', async () => {
    expect(await runStageLogic(KEY, 'research')).toEqual({ ok: true })
    const result = await updateSuburbsLogic(KEY, [{ name: '   ', slug: '' }])
    expect(result).toEqual({ ok: false, error: 'at least one suburb with a name is required' })
  })

  it('reports a key that has neither a draft nor a document', async () => {
    const result = await updateSuburbsLogic('ztest-nowhere', [{ name: 'X', slug: 'x' }])
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toMatch(/no draft research or published document/)
  })

  it('refuses a row whose slug is reserved by an existing static route, naming the slug', async () => {
    expect(await runStageLogic(KEY, 'research')).toEqual({ ok: true })

    const result = await updateSuburbsLogic(KEY, [{ name: 'FAQ Town', slug: 'faq' }])
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toMatch(/"faq"/)
    expect(result.ok === false && result.error).toMatch(/reserved/)

    // The rejected row must not have overwritten the draft's research.
    const draft = await loadDraft(KEY)
    expect(draft.research?.suburbs).not.toEqual([{ name: 'FAQ Town', slug: 'faq' }])
  })

  it('only guards the slug, not the name — a row named "Contact" with a distinct slug still passes', async () => {
    expect(await runStageLogic(KEY, 'research')).toEqual({ ok: true })

    expect(
      await updateSuburbsLogic(KEY, [{ name: 'Contact', slug: 'contact-heights' }]),
    ).toEqual({ ok: true })

    const draft = await loadDraft(KEY)
    expect(draft.research?.suburbs).toEqual([
      { name: 'Contact', slug: 'contact-heights', subdivisions: [], housingCharacter: '', conditions: [] },
    ])
  })
})

/*
 * Regression coverage for the research-wipe bug (feature 9): the editor
 * sends {name, slug} rows only, and updateSuburbsLogic used to spread that
 * straight over research.suburbs, discarding subdivisions/housingCharacter/
 * conditions on every save. These seed research.suburbs directly on the
 * draft rather than going through runStageLogic('research') — the research
 * stage's own schema validation is broken independently of this fix (Task
 * 5/6 changed ResearchSchema but tests/fixtures/stub-pipeline.json was not
 * updated to match, which is out of scope here; see the existing
 * updateSuburbsLogic tests above, which now fail at that same
 * runStageLogic('research') call for that unrelated reason).
 */
describe('updateSuburbsLogic — merge behaviour (feature 9 fix)', () => {
  const KEY = 'ztest-editville'

  const KATY_RESEARCH = {
    suburbs: [
      {
        name: 'Katy',
        slug: 'katy',
        subdivisions: ['Cinco Ranch', 'Firethorne', 'Cross Creek Ranch'],
        housingCharacter: 'Mostly 2000s-built single-family homes on large lots, heavy HOA presence.',
        conditions: [
          { condition: 'expansive clay soil', implication: 'seasonal foundation cracking', copySafe: true },
        ],
      },
    ],
    conditions: [],
    zips: ['00001'],
    keywords: ['house cleaning katy'],
  }

  beforeEach(async () => {
    await freshDraft(KEY)
    const draft = await loadDraft(KEY)
    draft.research = KATY_RESEARCH
    const { saveDraft } = await import('../src/content/drafts')
    await saveDraft(KEY, draft)
  })

  it('keeps researched fields when an operator saves the suburbs editor', async () => {
    expect(await updateSuburbsLogic(KEY, [{ name: 'Katy', slug: 'katy' }])).toEqual({ ok: true })

    const after = await loadDraft(KEY)
    expect(after.research!.suburbs[0].subdivisions).toEqual([
      'Cinco Ranch',
      'Firethorne',
      'Cross Creek Ranch',
    ])
    expect(after.research!.suburbs[0].housingCharacter).toBe(KATY_RESEARCH.suburbs[0].housingCharacter)
    expect(after.research!.suburbs[0].conditions).toEqual(KATY_RESEARCH.suburbs[0].conditions)
  })

  it('gives an operator-added row empty research instead of inheriting another area’s', async () => {
    expect(
      await updateSuburbsLogic(KEY, [
        { name: 'Katy', slug: 'katy' },
        { name: 'Fulshear', slug: 'fulshear' },
      ]),
    ).toEqual({ ok: true })

    const after = await loadDraft(KEY)
    expect(after.research!.suburbs[1].subdivisions).toEqual([])
    expect(after.research!.suburbs[1].housingCharacter).toBe('')
    expect(after.research!.suburbs[1].conditions).toEqual([])
    // Katy itself must be untouched by Fulshear's addition.
    expect(after.research!.suburbs[0].subdivisions).toEqual(KATY_RESEARCH.suburbs[0].subdivisions)
  })

  it('renaming an area without changing its slug keeps the old research (documented consequence)', async () => {
    expect(await updateSuburbsLogic(KEY, [{ name: 'Cypress', slug: 'katy' }])).toEqual({ ok: true })

    const after = await loadDraft(KEY)
    expect(after.research!.suburbs[0].name).toBe('Cypress')
    expect(after.research!.suburbs[0].subdivisions).toEqual(KATY_RESEARCH.suburbs[0].subdivisions)
  })
})

describe('parseZips', () => {
  it('accepts the separators an operator actually pastes', () => {
    expect(parseZips('77002, 77003 77004\n77005')).toEqual(['77002', '77003', '77004', '77005'])
  })

  it('drops anything that is not exactly five digits rather than guessing', () => {
    // A malformed ZIP is a visible error on a live page.
    expect(parseZips('77002, 7700, 770021, abcde, 77003')).toEqual(['77002', '77003'])
  })

  it('deduplicates and sorts', () => {
    expect(parseZips('77003 77002 77003')).toEqual(['77002', '77003'])
  })

  it('returns [] for blank or missing input', () => {
    expect(parseZips(undefined)).toEqual([])
    expect(parseZips('   ')).toEqual([])
  })
})

describe('parseReviews', () => {
  it('parses one review per line, fields separated by pipes', () => {
    const r = parseReviews('They got the grout white again. | Maria | Cinco Ranch')
    expect(r).toEqual({
      ok: true,
      reviews: [{ quote: 'They got the grout white again.', firstName: 'Maria', area: 'Cinco Ranch' }],
    })
  })

  it('accepts an optional fourth field as the date', () => {
    const r = parseReviews('Best clean we have had. | Dan | Telfair | 2025-06')
    expect(r).toEqual({
      ok: true,
      reviews: [
        { quote: 'Best clean we have had.', firstName: 'Dan', area: 'Telfair', date: '2025-06' },
      ],
    })
  })

  it('strips one surrounding pair of quote marks, straight or typographic', () => {
    // Operators paste reviews with the quotes already around them. The marks
    // are presentation, not part of what the customer said.
    const r = parseReviews('"On time, every time." | Ana | Katy\n\u201cWorth it.\u201d | Joe | Pearland')
    expect(r).toEqual({
      ok: true,
      reviews: [
        { quote: 'On time, every time.', firstName: 'Ana', area: 'Katy' },
        { quote: 'Worth it.', firstName: 'Joe', area: 'Pearland' },
      ],
    })
  })

  it('keeps commas and dashes inside the quote', () => {
    // Why the separator is a pipe and not a comma or an em dash: real reviews
    // are full of both, and splitting on them would mangle the quote.
    const r = parseReviews('Fast, thorough \u2014 and they came back. | Ana | Katy')
    expect(r).toEqual({
      ok: true,
      reviews: [
        { quote: 'Fast, thorough \u2014 and they came back.', firstName: 'Ana', area: 'Katy' },
      ],
    })
  })

  it('ignores blank lines and surrounding whitespace', () => {
    const r = parseReviews('\n  Spotless. | Ana | Katy  \n\n')
    expect(r).toEqual({ ok: true, reviews: [{ quote: 'Spotless.', firstName: 'Ana', area: 'Katy' }] })
  })

  it('returns no reviews for blank or missing input', () => {
    expect(parseReviews(undefined)).toEqual({ ok: true, reviews: [] })
    expect(parseReviews('   \n  ')).toEqual({ ok: true, reviews: [] })
  })

  it('REJECTS a line with a missing field instead of dropping it', () => {
    // Unlike a malformed ZIP, a review is a paragraph a human typed once.
    // Dropping it silently loses the one fact a competitor cannot reproduce.
    const r = parseReviews('Spotless. | Ana | Katy\nGreat job. | Joe')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('line 2')
  })

  it('REJECTS a line whose quote, name or area is empty', () => {
    const r = parseReviews('Spotless. |  | Katy')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('line 1')
  })

  it('REJECTS a line with an extra pipe rather than guessing which field it belongs to', () => {
    const r = parseReviews('Spotless | and fast. | Ana | Katy | 2025-06')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('line 1')
  })

  it('reports the line number of the FIRST bad line, counting blank lines', () => {
    // The operator is looking at a textarea; the number has to match what
    // their cursor is on, so blank lines count.
    const r = parseReviews('Spotless. | Ana | Katy\n\nGreat job. | Joe')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('line 3')
  })

  it('refuses more than MAX_REVIEWS rather than silently truncating', () => {
    const many = Array.from({ length: MAX_REVIEWS + 1 }, (_, i) => `Quote ${i}. | Ana | Katy`).join('\n')
    const r = parseReviews(many)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain(String(MAX_REVIEWS))
  })

  it('refuses an oversized body, because this crosses an untrusted RPC boundary', () => {
    // Same threat model sites/logic.ts states for MAX_RAW_LENGTH: any signed-in
    // caller can post here directly with no page ever rendered.
    const r = parseReviews('x'.repeat(MAX_REVIEWS_LENGTH + 1))
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('too long')
  })
})

describe('the ops block through the form', () => {
  const KEY = 'ztest-opsville'

  beforeEach(async () => {
    await wipe(KEY)
  })

  it('carries what the operator filled in onto the draft', async () => {
    const r = await createDraftFromFields({
      city: 'Ztest Opsville',
      state: 'MN',
      phone: '(612) 555-0142',
      zips: '55401, 55402',
      servingSince: '2024-03',
      crewLead: 'Maria',
      homesCleaned: '340',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return

    const draft = await loadDraft(r.key)
    expect(draft.facts.ops).toEqual({
      zips: ['55401', '55402'],
      servingSince: '2024-03',
      crewLead: 'Maria',
      homesCleaned: 340,
    })
    await wipe(r.key)
  })

  it('omits ops entirely when the operator filled in none of it', async () => {
    // An empty object would satisfy `!== undefined` and put a meaningless
    // `ops: {}` on every draft that never used the fields.
    const r = await createDraftFromFields({
      city: 'Ztest Opsville',
      state: 'MN',
      phone: '(612) 555-0142',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect((await loadDraft(r.key)).facts.ops).toBeUndefined()
    await wipe(r.key)
  })

  it('carries pasted reviews onto the draft as structured facts', async () => {
    const r = await createDraftFromFields({
      city: 'Ztest Opsville',
      state: 'MN',
      phone: '(612) 555-0142',
      reviews: '"They got the grout white again." | Maria | Linden Hills | 2025-06\nSpotless, every time. | Dan | Edina',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return

    expect((await loadDraft(r.key)).facts.ops).toEqual({
      reviews: [
        { quote: 'They got the grout white again.', firstName: 'Maria', area: 'Linden Hills', date: '2025-06' },
        { quote: 'Spotless, every time.', firstName: 'Dan', area: 'Edina' },
      ],
    })
    await wipe(r.key)
  })

  it('FAILS the whole create when a review line is malformed, rather than dropping it', async () => {
    const r = await createDraftFromFields({
      city: 'Ztest Opsville',
      state: 'MN',
      phone: '(612) 555-0142',
      reviews: 'Spotless. | Dan',
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain('line 1')
    // and nothing was written
    await expect(loadDraft('ztest-opsville')).rejects.toThrow()
  })

  it('keeps the fields that were filled and skips the ones that were not', async () => {
    const r = await createDraftFromFields({
      city: 'Ztest Opsville',
      state: 'MN',
      phone: '(612) 555-0142',
      crewLead: 'Maria',
      crewSize: '',
      homesCleaned: 'not a number',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect((await loadDraft(r.key)).facts.ops).toEqual({ crewLead: 'Maria' })
    await wipe(r.key)
  })
})

describe('pendingSuburbsLogic', () => {
  const KEY = 'ztest-editville'

  it('lists the areas the suburb stage still owes, so the client can drive one request each', async () => {
    await freshDraft(KEY)
    await runStageLogic(KEY, 'research')

    const before = await pendingSuburbsLogic(KEY)
    expect(before.ok).toBe(true)
    if (!before.ok) return
    expect(before.areas.length).toBeGreaterThan(0)
    // every entry carries what the progress display needs
    for (const a of before.areas) {
      expect(typeof a.slug).toBe('string')
      expect(typeof a.name).toBe('string')
    }

    // writing one area removes exactly that area from the list, so a resume
    // pays for only what is left
    const first = before.areas[0]
    await runStageLogic(KEY, 'suburb', first.slug)

    const after = await pendingSuburbsLogic(KEY)
    expect(after.ok).toBe(true)
    if (!after.ok) return
    expect(after.areas.map((a) => a.slug)).not.toContain(first.slug)
    expect(after.areas).toHaveLength(before.areas.length - 1)
  })

  it('returns an empty list before research has run rather than failing', async () => {
    await freshDraft(KEY)
    const r = await pendingSuburbsLogic(KEY)
    expect(r).toEqual({ ok: true, areas: [] })
  })
})

describe('regenerateLogic', () => {
  const KEY = 'ztest-editville'

  // 'stage run → finalize → publish' above leaves ztest-adminville LIVE and
  // never retires it — deliberately, listCities' own beforeEach re-wipes it
  // before touching it again. Every STUB_MODEL city carries the identical
  // canned "Stubville" copy (see stub-pipeline.json's header comment), so
  // once publishCity refuses duplicate content, that leftover live sibling
  // would make every publishLogic() call below collide with itself.
  beforeEach(async () => {
    await wipe('ztest-adminville')
  })

  it('re-runs one stage and reports success through the result shape', async () => {
    await freshDraft(KEY)
    await runAllStages(KEY)

    const draft = await loadDraft(KEY)
    draft.sections['deep.whatIs'] = 'STALE'
    const { saveDraft } = await import('../src/content/drafts')
    await saveDraft(KEY, draft)

    expect(await regenerateLogic(KEY, 'deep')).toEqual({ ok: true })
    expect((await loadDraft(KEY)).sections['deep.whatIs']).not.toBe('STALE')
  })

  it('clears downstream copy when research is regenerated', async () => {
    await freshDraft(KEY)
    await runAllStages(KEY)

    expect(await regenerateLogic(KEY, 'research')).toEqual({ ok: true })

    const draft = await loadDraft(KEY)
    expect(draft.done).toEqual(['research'])
    expect(draft.sections['deep.whatIs']).toBeUndefined()
  })

  it('cannot demote a LIVE city, even with a sidecar left over from a partial publish', async () => {
    /*
     * The review screen hides Regenerate once a city is published, because
     * publish retires the sidecar. That is a UI condition, and a publish
     * interrupted between "write the live document" and "delete the sidecar"
     * breaks it — the buttons come back on a city that is already serving
     * traffic. This reconstructs exactly that state and drives the panel's
     * real sequence (regenerate a stage, then finalize) against it. The city
     * must still be live afterwards with its domain intact: the guard lives in
     * finalizeDraft, not in the screen that happens to call it.
     */
    await freshDraft(KEY)
    await runAllStages(KEY)
    // Task 18: finalizeLogic now requires every surviving area's suburb
    // slots, so the suburb stage has to run before finalize can succeed.
    expect(await runStageLogic(KEY, 'suburb')).toEqual({ ok: true })
    expect(await finalizeLogic(KEY)).toEqual({ ok: true })

    const sidecar = await loadDraft(KEY)
    expect(await publishLogic(KEY, 'ztest-partial.example')).toEqual({ ok: true })
    const { saveDraft } = await import('../src/content/drafts')
    await saveDraft(KEY, sidecar) // the delete that never happened
    expect((await getCity(KEY)).status).toBe('live')

    expect(await regenerateLogic(KEY, 'deep')).toEqual({ ok: true })
    expect(await finalizeLogic(KEY)).toEqual({ ok: true })

    const doc = await getCity(KEY)
    expect(doc.status).toBe('live')
    expect(doc.domain).toBe('ztest-partial.example')
    expect(doc.sections['deep.whatIs']).toMatch(/Deep cleaning/)
  })
})

describe('getProgressLogic', () => {
  const KEY = 'ztest-editville'

  beforeEach(async () => {
    await freshDraft(KEY)
  })

  it('getProgressLogic returns events, done, and research lists after research runs', async () => {
    expect(await runStageLogic(KEY, 'research')).toEqual({ ok: true })

    const snap = await getProgressLogic(KEY)
    expect(snap.ok).toBe(true)
    if (snap.ok) {
      expect(snap.done).toContain('research')
      expect(snap.events.length).toBeGreaterThan(0)
      expect(snap.research?.suburbs.length).toBeGreaterThan(0)
      expect(typeof snap.research?.suburbs[0]).toBe('string') // names, not objects
    }
  })

  it('getProgressLogic on an unknown key returns ok:false', async () => {
    const snap = await getProgressLogic('no-such-city')
    expect(snap.ok).toBe(false)
  })
})

describe('listCities', () => {
  const KEY = 'ztest-adminville'

  function row(rows: Awaited<ReturnType<typeof listCities>>, key: string) {
    return rows.find((r) => r.key === key)
  }

  beforeEach(async () => {
    await wipe('ztest-editville')
    await wipe(KEY)
  })

  it('always carries the shipped cities with their document status', async () => {
    const rows = await listCities()
    expect(row(rows, 'minneapolis')).toMatchObject({ city: 'Minneapolis', status: 'live' })
    expect(row(rows, 'testville')).toMatchObject({ status: 'draft' })
  })

  it('labels a part-run sidecar GENERATING with its stage count', async () => {
    await freshDraft(KEY)
    expect(await runStageLogic(KEY, 'research')).toEqual({ ok: true })

    expect(row(await listCities(), KEY)).toMatchObject({
      city: 'Ztest Adminville',
      status: 'generating',
      hasDraft: true,
      doneCount: 1,
    })
  })

  // listCities' own logic (src/pipeline/admin-logic.ts) only flips to
  // 'draft-unfinalized' once ALL of STAGE_IDS are done. runAllStages here
  // deliberately tops out at RUNNABLE_STAGE_IDS (research/front/deep, not
  // suburb) so this test can exercise the genuinely-partial state: a draft
  // that has run three of the four stages is still, correctly, 'generating'.
  it('labels a sidecar that ran every currently-implemented stage as still GENERATING (suburb pending)', async () => {
    await freshDraft(KEY)
    await runAllStages(KEY)

    expect(row(await listCities(), KEY)).toMatchObject({
      status: 'generating',
      hasDraft: true,
      doneCount: 3,
    })
  })

  it('merges the two sources once finalized: document status wins, sidecar flagged', async () => {
    await freshDraft(KEY)
    await runAllStages(KEY)
    // Task 18: finalizeLogic now requires every surviving area's suburb
    // slots, so the suburb stage has to run before finalize can succeed —
    // which also brings doneCount to 4, not 3.
    expect(await runStageLogic(KEY, 'suburb')).toEqual({ ok: true })
    expect(await finalizeLogic(KEY)).toEqual({ ok: true })

    const rows = await listCities()
    expect(rows.filter((r) => r.key === KEY)).toHaveLength(1)
    expect(row(rows, KEY)).toMatchObject({ status: 'draft', hasDraft: true, doneCount: 4 })
  })

  it('shows a published city as LIVE with no sidecar left', async () => {
    await freshDraft(KEY)
    await runAllStages(KEY)
    expect(await runStageLogic(KEY, 'suburb')).toEqual({ ok: true })
    expect(await finalizeLogic(KEY)).toEqual({ ok: true })
    expect(await publishLogic(KEY)).toEqual({ ok: true })

    expect(row(await listCities(), KEY)).toMatchObject({ status: 'live', hasDraft: false })
  })

  it('is sorted by city name', async () => {
    const rows = await listCities()
    const names = rows.map((r) => r.city)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })
})

describe('ops survive publish', () => {
  const KEY = 'ztest-opsville'

  /*
   * Publishing refuses a city that duplicates a LIVE one, and every
   * STUB_MODEL city in this file generates byte-identical copy — so the
   * fixtures published by earlier describes have to be retired before this
   * one can publish at all. afterAll wipes all of KEYS and restores both
   * indexes, so retiring them here costs nothing.
   */
  async function retireSiblings(): Promise<void> {
    for (const other of KEYS) if (other !== KEY) await wipe(other)
  }

  it('carries the operator facts onto the published document', async () => {
    /*
     * publishCity deletes the draft sidecar, and the sidecar was the only
     * place ops lived. Without this, every operator fact a market has is
     * destroyed by the act of publishing it — and they are the one input
     * that cannot be researched or regenerated.
     */
    await wipe(KEY)
    const created = await createDraftFromFields({
      city: CITY_NAMES[KEY],
      state: 'mn',
      phone: '(612) 555-0142',
      crewLead: 'Maria',
      servingSince: '2024-03',
      homesCleaned: '340',
      reviews: 'Spotless, every time. | Dan | Edina',
    })
    expect(created.ok).toBe(true)

    await runAllStages(KEY)
    expect(await runStageLogic(KEY, 'suburb')).toEqual({ ok: true })
    expect(await finalizeLogic(KEY)).toEqual({ ok: true })

    const finalized = validateCityContent(JSON.parse(await readFile(cityPath(KEY), 'utf-8')))
    expect(finalized.ops).toEqual({
      crewLead: 'Maria',
      servingSince: '2024-03',
      homesCleaned: 340,
      reviews: [{ quote: 'Spotless, every time.', firstName: 'Dan', area: 'Edina' }],
    })

    await retireSiblings()
    expect(await publishLogic(KEY)).toEqual({ ok: true })
    const published = await getCity(KEY)
    expect(published.status).toBe('live')
    expect(published.ops?.crewLead).toBe('Maria')
    // and the sidecar really is gone, which is what made this necessary
    await expect(loadDraft(KEY)).rejects.toThrow()

    await wipe(KEY)
  })

  it('omits ops from the document entirely when the market has none', async () => {
    await wipe(KEY)
    expect((await freshDraft(KEY)).ok).toBe(true)
    await runAllStages(KEY)
    expect(await runStageLogic(KEY, 'suburb')).toEqual({ ok: true })
    expect(await finalizeLogic(KEY)).toEqual({ ok: true })

    const doc = JSON.parse(await readFile(cityPath(KEY), 'utf-8')) as Record<string, unknown>
    expect('ops' in doc).toBe(false)
    await wipe(KEY)
  })
})

describe('editing the ops block after creation', () => {
  const KEY = 'ztest-opsville'

  const FILLED = {
    zips: '55401, 55402',
    servingSince: '2024-03',
    crewLead: 'Maria',
    crewSize: '4',
    homesCleaned: '340',
    reviews: '"They got the grout white again." | Dan | Edina | 2025-06',
  }

  const EXPECTED = {
    zips: ['55401', '55402'],
    servingSince: '2024-03',
    crewLead: 'Maria',
    crewSize: 4,
    homesCleaned: 340,
    reviews: [
      { quote: 'They got the grout white again.', firstName: 'Dan', area: 'Edina', date: '2025-06' },
    ],
  }

  /** Draft sidecar only — a city part-way through the pipeline. */
  async function draftOnly(): Promise<void> {
    await wipe(KEY)
    expect((await freshDraft(KEY)).ok).toBe(true)
  }

  /** Published, sidecar deleted — the state every live city is in. */
  async function liveOnly(): Promise<void> {
    await draftOnly()
    await runAllStages(KEY)
    expect(await runStageLogic(KEY, 'suburb')).toEqual({ ok: true })
    expect(await finalizeLogic(KEY)).toEqual({ ok: true })
    for (const other of KEYS) if (other !== KEY) await wipe(other)
    expect(await publishLogic(KEY)).toEqual({ ok: true })
    await expect(loadDraft(KEY)).rejects.toThrow()
  }

  it('writes the facts onto a draft that has not been published yet', async () => {
    await draftOnly()
    expect(await updateOpsLogic(KEY, FILLED)).toEqual({ ok: true })
    expect((await loadDraft(KEY)).facts.ops).toEqual(EXPECTED)
    await wipe(KEY)
  })

  it('writes the facts onto a LIVE city, which has no sidecar left', async () => {
    // This is the case the create-time-only form could not reach at all:
    // hire a crew lead after launch and there was nowhere to record it.
    await liveOnly()
    expect(await updateOpsLogic(KEY, FILLED)).toEqual({ ok: true })
    expect((await getCity(KEY)).ops).toEqual(EXPECTED)
    await wipe(KEY)
  })

  it('updates BOTH copies when a city is finalized but not yet published', async () => {
    // Same two-places-at-once problem updateSuburbsLogic documents: an edit
    // that touched only one would be silently reverted by the other.
    await draftOnly()
    await runAllStages(KEY)
    expect(await runStageLogic(KEY, 'suburb')).toEqual({ ok: true })
    expect(await finalizeLogic(KEY)).toEqual({ ok: true })

    expect(await updateOpsLogic(KEY, FILLED)).toEqual({ ok: true })
    expect((await loadDraft(KEY)).facts.ops).toEqual(EXPECTED)
    expect((await getCity(KEY)).ops).toEqual(EXPECTED)
    await wipe(KEY)
  })

  it('removes ops entirely when every field is cleared, rather than storing {}', async () => {
    await draftOnly()
    expect(await updateOpsLogic(KEY, FILLED)).toEqual({ ok: true })
    expect(await updateOpsLogic(KEY, {})).toEqual({ ok: true })
    expect((await loadDraft(KEY)).facts.ops).toBeUndefined()
    await wipe(KEY)
  })

  it('rejects a malformed review line and leaves the stored facts untouched', async () => {
    await draftOnly()
    expect(await updateOpsLogic(KEY, FILLED)).toEqual({ ok: true })

    const bad = await updateOpsLogic(KEY, { ...FILLED, reviews: 'Spotless. | Dan' })
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.error).toContain('line 1')
    expect((await loadDraft(KEY)).facts.ops).toEqual(EXPECTED)
    await wipe(KEY)
  })

  it('fails loudly for a city that does not exist, instead of reporting success', async () => {
    await wipe(KEY)
    const r = await updateOpsLogic(KEY, FILLED)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toContain(KEY)
  })

  it('reads the stored facts back as the exact text the form should show', async () => {
    await draftOnly()
    expect(await updateOpsLogic(KEY, FILLED)).toEqual({ ok: true })

    const read = await readOpsLogic(KEY)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    // Round-trips: what comes out, put back in, stores the same facts.
    expect(await updateOpsLogic(KEY, read.fields)).toEqual({ ok: true })
    expect((await loadDraft(KEY)).facts.ops).toEqual(EXPECTED)

    expect(read.fields.crewLead).toBe('Maria')
    expect(read.fields.zips).toBe('55401, 55402')
    expect(read.fields.reviews).toBe('They got the grout white again. | Dan | Edina | 2025-06')
    await wipe(KEY)
  })

  it('reads a live city with no ops as empty fields rather than failing', async () => {
    await liveOnly()
    expect(await readOpsLogic(KEY)).toEqual({ ok: true, fields: {} })
    await wipe(KEY)
  })
})
