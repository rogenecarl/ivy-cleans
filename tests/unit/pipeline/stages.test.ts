// tests/unit/pipeline/stages.test.ts
/*
 * Stub end-to-end for the three pipeline stages (src/server/pipeline/stages/): a
 * draft goes in, three StubModelClient-backed stages run, finalizeDraft turns
 * it into a real CityContent, and getCity serves it. Plus the two behaviours
 * that make the admin screen safe to reload — resume (a done stage never
 * re-runs) and regenerate (research clears everything downstream). The prompt
 * builders are checked in prompts.test.ts, the uniqueness gate in research.test.ts.
 *
 * NO live API calls: the only client here is StubModelClient reading
 * tests/fixtures/stub-pipeline.json. The single key used is `ztest-stubville`;
 * its draft and content files are removed and _cities.json / _domains.json are
 * restored byte-for-byte in afterAll.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { REQUIRED_SLOTS, finalizeDraft, loadDraft, requiredSlotsFor, saveDraft } from '@/server/content/drafts'
import { getCity, revalidateCity } from '@/server/content/store'
import { validateCityContent } from '@/server/content/validate'
import { StubModelClient, type ModelClient } from '@/server/pipeline/model'
import { clearProgress, readProgress } from '@/server/pipeline/progress'
import * as stagesModule from '@/server/pipeline/stages'
import {
  SLUG_PATTERN,
  STAGES,
  SERVICE_LOCAL_SLUGS,
  serviceSlots,
  stageSlots,
  suburbSlots,
  normalizeResearchSlugs,
  regenerateStage,
  reservedSlugs,
  runStage,
  MODEL_KEYS,
  type StageId,
} from '@/server/pipeline/stages'
import { type ResearchOutput, type Suburb } from '@/server/pipeline/schemas'
import { LEGACY_POST_SLUGS } from '@/site/data/legacy-posts'
import {
  CONTENT_DIR,
  DRAFTS_DIR,
  CITIES_JSON,
  DOMAINS_JSON,
  KEY,
  RUNNABLE_STAGES,
  draftPath,
  cityPath,
  progressPath,
  StubFixtures,
  fixtures,
  CountingClient,
  newClient,
  fixtureResearch,
  resetDraft,
  loadFixtures,
} from './helpers'

describe('pipeline stages', () => {
  let citiesSnapshot: string
  let domainsSnapshot: string

  beforeAll(async () => {
    await loadFixtures()
    citiesSnapshot = await readFile(CITIES_JSON, 'utf-8')
    domainsSnapshot = await readFile(DOMAINS_JSON, 'utf-8')
  })

  afterAll(async () => {
    await rm(draftPath(KEY), { force: true })
    await rm(cityPath(KEY), { force: true })
    await rm(progressPath(KEY), { force: true })
    await writeFile(CITIES_JSON, citiesSnapshot, 'utf-8')
    await writeFile(DOMAINS_JSON, domainsSnapshot, 'utf-8')
    revalidateCity(KEY)

    const { readdir } = await import('node:fs/promises')
    expect(await readdir(CONTENT_DIR)).not.toContain(`${KEY}.json`)
    expect(await readdir(DRAFTS_DIR)).not.toContain(`${KEY}.json`)
    expect(await readdir(DRAFTS_DIR)).not.toContain(`${KEY}.progress.json`)
  })

  describe('STAGES metadata', () => {
    // The home stage is gone (Task 10) and the suburb stage exists (Task 14)
    // — its generation isn't implemented until Task 16, but the stage id,
    // label and slot ownership are structural and land here.
    it('the home stage no longer exists and the suburb stage does', () => {
      expect(STAGES.map((s) => s.id)).toEqual(['research', 'front', 'suburb', 'service'])
      for (const stage of STAGES) expect(stage.label.length).toBeGreaterThan(10)
    })

    it('the union of stageSlots(research) is exactly drafts.ts requiredSlotsFor(research)', () => {
      // Both directions matter: a required slot no stage owns can never be
      // regenerated (and, if a stage stopped writing it, would block finalize
      // forever); a stage slot that is not required is dead output. Uses a
      // real (multi-suburb) research fixture so the suburb slots are exercised
      // too, not just the eight research-free ones.
      //
      // Fixture Heights is deliberately ABSENT: it has no subdivisions, so
      // the suburb loop always skips it and stageSlots excludes it. If it
      // were listed here, finalize would demand three slots nothing is ever
      // going to write and the city could never be published.
      // EXPECTED is written out by hand from the fixture's suburbs
      // (house-cleaning-north-stubville, cleaning-services-mock-hollow,
      // fixture-heights-cleaning-services) rather than derived by calling
      // stageSlots/requiredSlotsFor — requiredSlotsFor's own body is
      // `STAGES.flatMap((stage) => stageSlots(research)[stage.id])`, so
      // comparing that same expression's output to itself would hold by
      // construction and could never catch a real drift between the two.
      const research = fixtureResearch()
      const EXPECTED: readonly string[] = [
        'services.heroParagraphs',
        'services.serviceIntro',
        'services.cards.dusting',
        'services.cards.vacuuming',
        'services.cards.bathroom',
        'services.cards.window',
        'services.cards.upholstery',
                'suburb.house-cleaning-north-stubville.intro',
        'suburb.house-cleaning-north-stubville.homes',
        'suburb.house-cleaning-north-stubville.local',
        'suburb.cleaning-services-mock-hollow.intro',
        'suburb.cleaning-services-mock-hollow.homes',
        'suburb.cleaning-services-mock-hollow.local',
        'service.standard-cleaning.local',
        'service.deep-cleaning.local',
        'service.apartment-cleaning.local',
        'service.airbnb-cleaning.local',
        'service.post-construction-cleaning.local',
        'service.pre-listing-cleaning.local',
      ]
      const owned = STAGES.flatMap((stage) => stageSlots(research)[stage.id])
      expect(owned).toHaveLength(new Set(owned).size)
      expect([...owned].sort()).toEqual([...EXPECTED].sort())
      expect([...requiredSlotsFor(research)].sort()).toEqual([...EXPECTED].sort())
    })

    it('owns one local slot per template service, whether or not research has run', () => {
      // Unlike suburb slots these do not depend on research: the seven
      // services are the same in every city, so the six are owed from the
      // moment a draft exists.
      const withResearch = stageSlots(fixtureResearch()).service
      const without = stageSlots(undefined).service
      expect(withResearch).toEqual(without)
      expect(withResearch).toEqual([
        'service.standard-cleaning.local',
        'service.deep-cleaning.local',
        'service.apartment-cleaning.local',
        'service.airbnb-cleaning.local',
        'service.post-construction-cleaning.local',
        'service.pre-listing-cleaning.local',
      ])
    })

    it('serviceSlots() is the slot-id contract both the writer and the reader use', () => {
      expect(serviceSlots('airbnb-cleaning')).toEqual(['service.airbnb-cleaning.local'])
    })

    it('SERVICE_LOCAL_SLUGS matches the registry exactly, minus the bespoke page', async () => {
      /*
       * slots.ts declares the six slugs LOCALLY rather than importing the
       * registry: slots -> registry -> deep-cleaning -> slots is a genuine
       * ESM cycle, the same class this file's own header warns about. This
       * test is what keeps the local copy honest — register a seventh
       * template service and it fails here rather than silently never
       * generating that page's local section.
       *
       * move-in-move-out-cleaning is `bespoke`: its own five components, live
       * on Minneapolis today, and deliberately out of scope for this stage.
       */
      const { allServices } = await import('@/site/data/services/registry')
      const template = allServices()
        .filter((e) => e.kind === 'template')
        .map((e) => e.slug)
      expect([...SERVICE_LOCAL_SLUGS]).toEqual(template)
      expect(SERVICE_LOCAL_SLUGS).not.toContain('move-in-move-out-cleaning')
    })

    it('emits exactly three suburb slots per WRITABLE area', () => {
      // Non-empty subdivisions matter: stageSlots excludes areas that can
      // never be written, so finalize does not demand slots the suburb loop
      // will always skip.
      const katy: Suburb = { name: 'Katy', slug: 'katy', subdivisions: ['Cinco Ranch'], housingCharacter: '', neighbors: [], conditions: [] }
      const sugarLand: Suburb = { name: 'Sugar Land', slug: 'sugar-land', subdivisions: ['Riverstone'], housingCharacter: '', neighbors: [], conditions: [] }
      const research: ResearchOutput = { suburbs: [katy, sugarLand], conditions: [], zips: [], keywords: [] }
      expect(stageSlots(research).suburb).toHaveLength(6)
    })

    it('emits no slots for an area with no subdivisions — nothing will ever write them', () => {
      const thin: Suburb = { name: 'Thin', slug: 'thin', subdivisions: [], housingCharacter: '', neighbors: [], conditions: [] }
      const research: ResearchOutput = { suburbs: [thin], conditions: [], zips: [], keywords: [] }
      expect(stageSlots(research).suburb).toEqual([])
      expect(requiredSlotsFor(research)).not.toContain('suburb.thin.intro')
    })

    it('emits no suburb slots when research has not run', () => {
      expect(stageSlots(undefined).suburb).toEqual([])
    })

    // Task 16 (executeStage's suburb case) and Task 17 (the suburb data
    // reader) both key their reads and writes off this exact string shape —
    // a mismatch between them would be silent, so the literal is pinned here.
    it('suburb slot ids are exactly suburb.<slug>.intro / .homes / .local', () => {
      expect(suburbSlots('katy')).toEqual(['suburb.katy.intro', 'suburb.katy.homes', 'suburb.katy.local'])
    })

    it('REQUIRED_SLOTS (the research-free base) no longer contains the home slots', () => {
      expect(REQUIRED_SLOTS).not.toContain('home.zipParagraph')
      expect(REQUIRED_SLOTS).not.toContain('home.landmarksParagraph')
    })
  })

  describe('full stub run', () => {
    let client: CountingClient

    beforeAll(async () => {
      await resetDraft()
      client = newClient()
      for (const stage of RUNNABLE_STAGES) await runStage(client, KEY, stage.id)
    })

    it('calls the model once per stage, research being three passes plus two structuring calls', () => {
      expect(client.calls).toEqual([
        'research:research.metro',
        'research:research.areas',
        'generate:research.structure.areas',
        'research:research.area.north-stubville',
        'research:research.area.mock-hollow',
        'research:research.area.fixture-heights',
        'generate:research.structure',
        'generate:front',
      ])
    })

    it('records every stage as done and stores the research object', async () => {
      const draft = await loadDraft(KEY)
      expect(draft.done).toEqual(['research', 'front'])
      expect(draft.research?.zips).toEqual(['00001', '00002'])
      // Fixture Heights (0 researched, everything blank) is a 'skip' verdict
      // under the uniqueness gate wired into the research stage — only the
      // two researched areas survive.
      expect(draft.research?.suburbs).toHaveLength(2)
    })

    it('fills all seven research-free section slots with the fixture copy', async () => {
      const draft = await loadDraft(KEY)
      const hero = draft.sections['services.heroParagraphs'] as string[]
      const intro = draft.sections['services.serviceIntro'] as string[]
      expect(hero).toHaveLength(5)
      expect(intro).toHaveLength(5)
      expect(hero[0]).toMatch(/Stubville/)
      expect(draft.sections['services.cards.dusting']).toMatch(/Stubville/)
      expect(draft.sections['services.cards.vacuuming']).toMatch(/Stubville/)
      expect(draft.sections['services.cards.bathroom']).toMatch(/Stubville/)
      expect(draft.sections['services.cards.window']).toMatch(/Stubville/)
      expect(draft.sections['services.cards.upholstery']).toMatch(/Stubville/)
      // The home stage is gone (Task 10) — no home.* slot is ever written.
      expect(draft.sections['home.zipParagraph']).toBeUndefined()
      expect(draft.sections['home.landmarksParagraph']).toBeUndefined()
    })

    it('finalizes into a valid CityContent that getCity resolves', async () => {
      // RUNNABLE_STAGES (this describe's beforeAll) deliberately excludes
      // 'suburb' — it predates Task 16. finalizeDraft now requires every
      // surviving area's three slots (Task 18), so this test runs that
      // stage itself, on a fresh client so it doesn't disturb the earlier
      // "calls the model once per stage" assertion's call log.
      await runStage(newClient(), KEY, 'suburb')
      await runStage(newClient(), KEY, 'service')
      await finalizeDraft(KEY)

      const raw = JSON.parse(await readFile(cityPath(KEY), 'utf-8'))
      const validated = validateCityContent(raw)
      expect(validated.city).toBe('Ztest Stubville')
      expect(validated.status).toBe('draft')
      expect(validated.research.zips).toEqual(['00001', '00002'])
      expect(validated.sections['home.landmarksParagraph']).toBeUndefined()
      // The gap Task 18 closes: generated area copy must reach the
      // published document, not be silently dropped at finalize.
      expect(validated.sections['suburb.house-cleaning-north-stubville.intro']).toBeTruthy()
      expect(validated.sections['suburb.cleaning-services-mock-hollow.intro']).toBeTruthy()

      const cities = JSON.parse(await readFile(CITIES_JSON, 'utf-8')) as string[]
      expect(cities).toContain(KEY)

      const resolved = await getCity(KEY)
      expect(resolved.city).toBe('Ztest Stubville')
      expect(resolved.sections['services.cards.upholstery']).toMatch(/Stubville/)
    })
  })

  describe('resume semantics', () => {
    beforeEach(async () => {
      await resetDraft()
      const client = newClient()
      for (const stage of RUNNABLE_STAGES) await runStage(client, KEY, stage.id)
    })

    it('re-running a completed pipeline executes nothing', async () => {
      const client = newClient()
      for (const stage of RUNNABLE_STAGES) await runStage(client, KEY, stage.id)
      expect(client.calls).toEqual([])
    })

    it('re-runs only the stage whose done entry was removed', async () => {
      const draft = await loadDraft(KEY)
      draft.done = draft.done.filter((s) => s !== 'front')
      draft.sections['services.heroParagraphs'] = ['STALE']
      await saveDraft(KEY, draft)

      const client = newClient()
      for (const stage of RUNNABLE_STAGES) await runStage(client, KEY, stage.id)

      expect(client.calls).toEqual(['generate:front'])
      const after = await loadDraft(KEY)
      // 'front' was removed from the middle and re-appended on completion —
      // proof the resume picks up exactly the missing stage, not just "the
      // next one in STAGES order".
      expect(after.done).toEqual(['research', 'front'])
      expect((after.sections['services.heroParagraphs'] as string[])[0]).toMatch(/Stubville/)
    })

    it('a stage that needs research but has none throws instead of writing junk', async () => {
      const draft = await loadDraft(KEY)
      draft.done = []
      delete draft.research
      await saveDraft(KEY, draft)

      await expect(runStage(newClient(), KEY, 'front')).rejects.toThrow(/research stage has not completed/)
    })
  })

  describe('regenerateStage', () => {
    beforeEach(async () => {
      await resetDraft()
      const client = newClient()
      for (const stage of RUNNABLE_STAGES) await runStage(client, KEY, stage.id)
    })

    it('re-runs a single downstream stage without touching the others', async () => {
      const client = newClient()
      await regenerateStage(client, KEY, 'front')

      expect(client.calls).toEqual(['generate:front'])
      const draft = await loadDraft(KEY)
      expect(draft.done).toEqual(['research', 'front'])
      expect(draft.sections['services.cards.dusting']).toMatch(/Stubville/)
    })

    it('only clears a per-item stage, leaving the client loop to rewrite it one request per item', async () => {
      // twelve areas in one server action is minutes; Vercel kills it partway with half the areas cleared
      for (const stage of ['suburb', 'service'] as const) {
        const client = newClient()
        await regenerateStage(client, KEY, stage)

        expect(client.calls).toEqual([])
        const draft = await loadDraft(KEY)
        expect(draft.done).not.toContain(stage)
        for (const slot of stageSlots(draft.research)[stage]) expect(draft.sections[slot]).toBeUndefined()
      }
    })

    it('clears every downstream stage when research is regenerated', async () => {
      const client = newClient()
      await regenerateStage(client, KEY, 'research')

      // Only research re-ran; front/deep are cleared, awaiting their own runs.
      expect(client.calls).toEqual([
        'research:research.metro',
        'research:research.areas',
        'generate:research.structure.areas',
        'research:research.area.north-stubville',
        'research:research.area.mock-hollow',
        'research:research.area.fixture-heights',
        'generate:research.structure',
      ])

      const draft = await loadDraft(KEY)
      expect(draft.done).toEqual(['research'])
      expect(draft.research).toBeDefined()
      for (const slot of [
        'services.heroParagraphs',
        'services.serviceIntro',
        'services.cards.dusting',
        'services.cards.upholstery',
              ]) {
        expect(draft.sections[slot]).toBeUndefined()
      }
    })

    // The suburb stage isn't runnable yet (Task 16), so this seeds its output
    // by hand rather than by running it — the point under test is that
    // regenerateStage('research') clears whatever suburb.* slots the CURRENT
    // draft.research says exist, not that the suburb stage itself works.
    // This is exactly the failure regenerateStage exists to prevent: area
    // copy left in place citing a suburb list the site no longer has.
    it('clears suburb slots along with front and deep when research is regenerated', async () => {
      const draft = await loadDraft(KEY)
      const slug = draft.research!.suburbs[0].slug
      for (const slot of suburbSlots(slug)) draft.sections[slot] = `stale ${slot}`
      await saveDraft(KEY, draft)

      const client = newClient()
      await regenerateStage(client, KEY, 'research')

      const after = await loadDraft(KEY)
      for (const slot of suburbSlots(slug)) {
        expect(after.sections[slot]).toBeUndefined()
      }
      // front/deep are still cleared too — the seeded suburb slot didn't
      // change that existing guarantee.
      expect(after.sections['deep.whatIs']).toBeUndefined()
    })

    it('leaves the draft runnable again after a research regenerate', async () => {
      await regenerateStage(newClient(), KEY, 'research')

      const client = newClient()
      for (const stage of RUNNABLE_STAGES) await runStage(client, KEY, stage.id)

      expect(client.calls).toEqual(['generate:front'])
      const draft = await loadDraft(KEY)
      expect(draft.done).toEqual(['research', 'front'])
      expect(Object.keys(draft.sections)).toHaveLength(7)
    })
  })

  describe('progress events', () => {
    beforeEach(async () => {
      await resetDraft()
      await clearProgress(KEY)
    })

    it('runStage(research) writes start, forwarded search, found summary, and done events', async () => {
      await runStage(newClient(), KEY, 'research')
      const events = await readProgress(KEY)
      const kinds = events.map((e) => e.kind)
      expect(kinds[0]).toBe('start')
      expect(kinds).toContain('search') // forwarded from the stub fixture
      // 'Collected findings', the areas/ZIP/subdivisions/keywords digest, and
      // the uniqueness-gate summary are all appended as 'found'.
      expect(kinds.filter((k) => k === 'found').length).toBe(3)
      expect(kinds[kinds.length - 1]).toBe('done')
      expect(events.every((e) => e.stage === 'research')).toBe(true)
    })

    it('front done event carries the counts summary', async () => {
      await runStage(newClient(), KEY, 'research')
      await runStage(newClient(), KEY, 'front')
      const events = await readProgress(KEY)
      const done = events.filter((e) => e.stage === 'front' && e.kind === 'done')
      expect(done).toHaveLength(1)
      expect(done[0].label).toMatch(/hero paragraphs · .* intro paragraphs · 5 service cards/)
    })

    it('a failing stage appends an error event and still rejects', async () => {
      const failing: ModelClient = {
      usage: { calls: 0, inputTokens: 0, outputTokens: 0, byModel: {} },
        research: async () => {
          throw new Error('boom')
        },
        generate: async () => {
          throw new Error('boom')
        },
      }
      await expect(runStage(failing, KEY, 'research')).rejects.toThrow('boom')
      const events = await readProgress(KEY)
      expect(events[events.length - 1]).toMatchObject({
        stage: 'research',
        kind: 'error',
        label: expect.stringContaining('boom'),
      })
    })

    it('regenerateStage(research) clears research AND downstream progress', async () => {
      for (const stage of RUNNABLE_STAGES) await runStage(newClient(), KEY, stage.id)

      await regenerateStage(newClient(), KEY, 'research')

      // regenerate re-runs research immediately, so only fresh research events remain.
      const events = await readProgress(KEY)
      expect(events.length).toBeGreaterThan(0)
      expect(events.every((e) => e.stage === 'research')).toBe(true)
    })
  })

  describe('slug normalization', () => {
    /** Fixture variant whose structuring call returns hostile slugs. */
    function messyFixtures(): StubFixtures {
      // Not actually blank: the uniqueness gate now runs right after slug
      // normalization inside the research stage, so a genuinely 0-scored
      // suburb here would vanish before these slug assertions ever saw it.
      // This fixture exists to test slug normalization, not the gate, so
      // every entry carries just enough (4 subdivisions + housing character,
      // scoring 6 — 'review', not 'skip') to survive it untouched.
      const enoughToSurvive = {
        subdivisions: ['A', 'B', 'C', 'D'],
        housingCharacter: 'Present.',
        neighbors: [],
        conditions: [],
      }
      const structured = {
        ...(fixtures.generated['research.structure'] as ResearchOutput),
        suburbs: [
          { name: 'Weird Slug', slug: 'Weird Slug!', ...enoughToSurvive },
          { name: 'Weird Slug Again', slug: 'weird--slug', ...enoughToSurvive },
          { name: 'Mock Hollow', slug: 'cleaning-services-mock-hollow', ...enoughToSurvive },
          { name: 'Mock Hollow Duplicate', slug: 'Cleaning-Services-Mock-Hollow', ...enoughToSurvive },
          { name: 'Under Scored', slug: '  house_cleaning_under scored  ', ...enoughToSurvive },
          { name: 'Punctuation Only', slug: '!!!', ...enoughToSurvive },
        ],
      }
      return {
        research: fixtures.research,
        generated: { ...fixtures.generated, 'research.structure': structured },
      }
    }

    it('normalizes to a-z0-9-hyphen and drops duplicates, keeping the first', async () => {
      await resetDraft()
      await runStage(new CountingClient(new StubModelClient(messyFixtures())), KEY, 'research')

      const draft = await loadDraft(KEY)
      const slugs = draft.research!.suburbs.map((s) => s.slug)

      expect(slugs).toEqual([
        'weird-slug',
        'cleaning-services-mock-hollow',
        'house-cleaning-under-scored',
      ])
      // 'weird--slug' collapsed onto the first entry's slug and was dropped,
      // the case-different duplicate was dropped, and '!!!' normalized to
      // nothing so it went too.
      expect(draft.research!.suburbs[0].name).toBe('Weird Slug')
      for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(new Set(slugs).size).toBe(slugs.length)
    })

    it('leaves already-clean fixture slugs untouched', async () => {
      await resetDraft()
      await runStage(newClient(), KEY, 'research')

      const draft = await loadDraft(KEY)
      // Fixture Heights is dropped by the uniqueness gate (nothing researched
      // for it), so only the two researched areas' slugs survive.
      expect(draft.research!.suburbs.map((s) => s.slug)).toEqual([
        'house-cleaning-north-stubville',
        'cleaning-services-mock-hollow',
      ])
    })

    it('drops suburb entries whose slug is reserved by a static sibling route or by this city\'s own computed service slugs', () => {
      const research: ResearchOutput = {
        ...fixtureResearch(),
        suburbs: [
          { name: 'Contact Corner', slug: 'contact', subdivisions: [], housingCharacter: '', neighbors: [], conditions: [] },
          {
            name: 'Deep Clean Heights',
            slug: 'deep-cleaning-ztest-stubville',
            subdivisions: [],
            housingCharacter: '',
            neighbors: [],
            conditions: [],
          },
          { name: 'Real Suburb', slug: 'real-suburb', subdivisions: [], housingCharacter: '', neighbors: [], conditions: [] },
        ],
      }

      expect(normalizeResearchSlugs(research, 'Ztest Stubville').suburbs).toEqual([
        { name: 'Real Suburb', slug: 'real-suburb', subdivisions: [], housingCharacter: '', neighbors: [], conditions: [] },
      ])
    })

    it('preserves subdivisions, housingCharacter and conditions even when the slug is rewritten', () => {
      // A literal-rebuild ({ name, slug }) would drop everything below and
      // this test would fail; only a spread ({ ...suburb, slug }) survives it.
      const suburb: Suburb = {
        name: 'Mixed Case Suburb',
        slug: 'Mixed CASE_Suburb!',
        subdivisions: ['Cinco Ranch', 'Firethorne'],
        housingCharacter: 'Master-planned, 2000 onward.',
        neighbors: [],
        conditions: [{ condition: 'Construction nearby', implication: 'Grit on sills', copySafe: true }],
      }
      const research: ResearchOutput = { suburbs: [suburb], conditions: [], zips: [], keywords: [] }

      const result = normalizeResearchSlugs(research, 'Ztest Stubville').suburbs[0]

      expect(result.slug).toBe('mixed-case-suburb') // proves normalization actually ran
      expect(result.slug).not.toBe(suburb.slug)
      expect(result.subdivisions).toEqual(suburb.subdivisions)
      expect(result.housingCharacter).toBe(suburb.housingCharacter)
      expect(result.conditions).toEqual(suburb.conditions)
    })

    it('reservedSlugs is the static sibling routes, every blog post URL, and this city\'s two computed service slugs', () => {
      // Enumerated from src/app/(sites)/[city]/(front)/ and .../(inner)/ — see
      // that comment on reservedSlugs for the folder-by-folder citation.
      const reserved = reservedSlugs('Ztest Stubville')
      expect(reserved).toEqual(
        new Set([
          'book-now',
          'blog',
          'book',
          'cleaning-services',
          'contact',
          'faq',
          'home',
          'privacy-policy',
          'services',
          ...LEGACY_POST_SLUGS,
          'deep-cleaning-ztest-stubville',
          'ztest-stubville-move-out-cleaning-services',
        ]),
      )
    })

    it('reserves every WordPress-era post slug, so a suburb cannot claim a URL that still redirects', () => {
      const reserved = reservedSlugs('Ztest Stubville')
      for (const slug of LEGACY_POST_SLUGS) expect(reserved.has(slug), slug).toBe(true)
    })
  })


  describe('the gate wired into the research stage', () => {
    /**
     * Same three fixture suburbs, but every one carries enough subdivisions
     * and housing character to score 'build' or 'review' — nothing to skip.
     * Proves the "dropped" text is conditional, not unconditionally appended.
     */
    function allGoodFixtures(): StubFixtures {
      const researched = { subdivisions: ['A', 'B', 'C', 'D'], housingCharacter: 'Present.', neighbors: [], conditions: [] }
      const structured = {
        ...(fixtures.generated['research.structure'] as ResearchOutput),
        suburbs: [
          { name: 'North Stubville', slug: 'house-cleaning-north-stubville', ...researched },
          { name: 'Mock Hollow', slug: 'cleaning-services-mock-hollow', ...researched },
          { name: 'Fixture Heights', slug: 'fixture-heights-cleaning-services', ...researched },
        ],
      }
      return {
        research: fixtures.research,
        generated: { ...fixtures.generated, 'research.structure': structured },
      }
    }

    beforeEach(async () => {
      await resetDraft()
      await clearProgress(KEY)
    })

    it('running research under STUB_MODEL=1 drops the empty area from draft.research.suburbs', async () => {
      // stub-pipeline.json's Fixture Heights has nothing researched
      // (subdivisions [], housingCharacter '', conditions []) — score 0,
      // verdict 'skip'. North Stubville and Mock Hollow are researched
      // enough to survive.
      await runStage(newClient(), KEY, 'research')

      const draft = await loadDraft(KEY)
      const names = draft.research!.suburbs.map((s) => s.name)
      expect(names).not.toContain('Fixture Heights')
      expect(names).toEqual(['North Stubville', 'Mock Hollow'])
    })

    it('names the areas the gate dropped in the progress line', async () => {
      // A dropped area must never look like research simply finding less
      // than usual, so its name is printed rather than swallowed.
      await runStage(newClient(), KEY, 'research')

      const events = await readProgress(KEY)
      const dropped = events.find((e) => /no developments found for/.test(e.label))
      expect(dropped).toBeDefined()
      expect(dropped!.label).toContain('Fixture Heights')
    })

    it('an all-good fixture never appends "dropped" text to any progress entry', async () => {
      await runStage(new CountingClient(new StubModelClient(allGoodFixtures())), KEY, 'research')

      const events = await readProgress(KEY)
      expect(events.some((e) => /no developments found for/.test(e.label))).toBe(false)
      // Confirms the label is genuinely conditional, not just missing the
      // word: all three areas were kept.
      expect((await loadDraft(KEY)).research!.suburbs).toHaveLength(3)
    })
  })









  // Task 20: the four rotated slug shapes ('house-cleaning-<area>', etc.)
  // were dead code — nothing in the stages module ever read SLUG_PATTERNS to build a
  // slug, the model was only ever told about the rotation through the
  // structuring prompt (asserted above). Minneapolis's stored slugs already
  // exercise every one of the retired shapes below, so this only has to
  // prove the constant collapsed and that normalizeResearchSlugs (which is
  // the actual code path a slug goes through) never rewrites a slug's shape
  // — only its characters — so Minneapolis's pages are untouched.
  describe('SLUG_PATTERN', () => {
    it('is a bare <area> placeholder, not the old four-pattern rotation', () => {
      expect(SLUG_PATTERN).toBe('<area>')
    })

    it('no longer exports SLUG_PATTERNS', () => {
      expect((stagesModule as Record<string, unknown>).SLUG_PATTERNS).toBeUndefined()
    })

    it('a newly structured city gets a bare <area> slug through normalizeResearchSlugs', () => {
      // Simulates what a model following the new prompt returns: no prefix,
      // no suffix, just the hyphenated area name.
      const research: ResearchOutput = {
        suburbs: [{ name: 'New Suburb', slug: 'new-suburb', subdivisions: [], housingCharacter: '', neighbors: [], conditions: [] }],
        conditions: [],
        zips: [],
        keywords: [],
      }
      const result = normalizeResearchSlugs(research, 'Ztest Stubville')
      expect(result.suburbs[0].slug).toBe('new-suburb')
    })

    it("leaves Minneapolis's stored slugs untouched — they still carry the retired rotated forms", async () => {
      const mpls = await getCity('minneapolis')
      const slugs = mpls.research.suburbs.map((s) => s.slug)
      expect(slugs.some((s) => s.startsWith('house-cleaning-'))).toBe(true)
      expect(slugs.some((s) => s.startsWith('cleaning-services-'))).toBe(true)
      expect(slugs.some((s) => s.startsWith('cleaning-service-'))).toBe(true)
      expect(slugs.some((s) => s.endsWith('-cleaning-services') && !s.startsWith('cleaning-services-'))).toBe(true)
    })
  })



  describe('stage id typing', () => {
    it('runStage accepts only the four known ids', async () => {
      const ids: StageId[] = ['research', 'front', 'suburb', 'service']
      expect(ids).toEqual(STAGES.map((s) => s.id))
    })
  })


  describe('the research summary line', () => {
    /*
     * The line an operator reads to know whether a $3 run was worth it.
     *
     * It used to say "10 areas kept · 2 thin · 2 dropped: …" and the numbers
     * did not reconcile: `r.suburbs.length` is the POST-gate list, so the two
     * thin areas were already inside the ten, and the line read as twelve.
     *
     * "thin" is gone from here entirely. A progress line reports what
     * happened; the review screen's "Before you publish" panel reports what
     * needs deciding, and it already lists the thin areas. And "kept / thin /
     * dropped" made an operator learn three words to read one status line.
     */
    it('reconciles its own arithmetic and names what was dropped, and why', async () => {
      await resetDraft()
      await runStage(newClient(), KEY, 'research')

      const events = await readProgress(KEY)
      const summary = events.find((e) => e.label.includes('will get a page'))
      expect(summary).toBeDefined()

      // The fixture researches three areas; Fixture Heights has zero
      // subdivisions, so the gate drops exactly it.
      expect(summary!.label).toMatch(/^2 of 3 areas will get a page/)
      expect(summary!.label).toContain('Fixture Heights')
      expect(summary!.label).toMatch(/no developments found/)
      expect(summary!.label).not.toMatch(/kept|thin|dropped/)
    })
  })

  describe('service stage', () => {
    const AIRBNB = 'service.airbnb-cleaning.local'

    beforeEach(async () => {
      await resetDraft()
      await runStage(newClient(), KEY, 'research')
    })

    it('writes one local slot per template service, matching stageSlots exactly', async () => {
      await runStage(newClient(), KEY, 'service')
      const draft = await loadDraft(KEY)

      expect(draft.done).toContain('service')
      for (const slot of stageSlots(draft.research).service) {
        expect(draft.sections[slot]).toBeTruthy()
      }
      // Pin the literal id and its fixture text: the render side reads this
      // id verbatim, and a mismatch there is silent (the paragraph simply
      // never appears).
      const fixture = fixtures.generated['service.airbnb-cleaning'] as { local: string }
      expect(draft.sections[AIRBNB]).toBe(fixture.local)
    })

    it('writes a DIFFERENT paragraph for each service', async () => {
      // A bug returning one shared string for all six would still satisfy
      // "every slot is truthy".
      await runStage(newClient(), KEY, 'service')
      const draft = await loadDraft(KEY)
      const written = stageSlots(draft.research).service.map((slot) => draft.sections[slot])
      expect(new Set(written).size).toBe(written.length)
    })

    it('runs ONE service when given a slug, leaving the others untouched', async () => {
      // The admin drives this loop one service per request: six model calls
      // in a single request is minutes, and a serverless function is killed
      // long before that. Same shape as the suburb stage.
      const client = newClient()
      await runStage(client, KEY, 'service', 'airbnb-cleaning')
      const draft = await loadDraft(KEY)

      expect(draft.sections[AIRBNB]).toBeTruthy()
      expect(draft.sections['service.deep-cleaning.local']).toBeUndefined()
      expect(client.usage.calls).toBe(1)
    })

    it('does not pay twice for a service already written', async () => {
      await runStage(newClient(), KEY, 'service', 'airbnb-cleaning')
      const second = newClient()
      await runStage(second, KEY, 'service', 'airbnb-cleaning')
      expect(second.usage.calls).toBe(0)
    })

    it('refuses a slug that is not a template service rather than silently doing nothing', async () => {
      await expect(runStage(newClient(), KEY, 'service', 'move-in-move-out-cleaning')).rejects.toThrow(
        /move-in-move-out-cleaning/,
      )
    })

    it('regenerating research clears the service copy too', async () => {
      // Every local section is built from research.conditions, so research
      // that changed underneath them makes them stale in exactly the way
      // front/deep/suburb are.
      await runStage(newClient(), KEY, 'service')
      expect((await loadDraft(KEY)).sections[AIRBNB]).toBeTruthy()

      await regenerateStage(newClient(), KEY, 'research')
      const draft = await loadDraft(KEY)
      expect(draft.sections[AIRBNB]).toBeUndefined()
      expect(draft.done).not.toContain('service')
    })
  })

  describe('suburb stage', () => {
    const NORTH = 'house-cleaning-north-stubville'
    const MOCK_HOLLOW = 'cleaning-services-mock-hollow'

    beforeEach(async () => {
      await resetDraft()
      await runStage(newClient(), KEY, 'research')
    })

    it('writes all three slots for every kept area, matching suburbSlots(slug) exactly', async () => {
      await runStage(newClient(), KEY, 'suburb')
      const draft = await loadDraft(KEY)

      expect(draft.research!.suburbs.map((s) => s.slug)).toEqual([NORTH, MOCK_HOLLOW])
      expect(draft.done).toContain('suburb')

      for (const slug of [NORTH, MOCK_HOLLOW]) {
        for (const slot of suburbSlots(slug)) {
          expect(draft.sections[slot]).toBeTruthy()
        }
      }

      // Pin the literal slot ids and their exact fixture text for a known
      // slug — Task 17 reads these ids verbatim, and a mismatch there would
      // be silent (fallback template renders, page looks unchanged).
      const fixture = fixtures.generated[`suburb.${NORTH}`] as { intro: string; homes: string; local: string }
      expect(draft.sections[`suburb.${NORTH}.intro`]).toBe(fixture.intro)
      expect(draft.sections[`suburb.${NORTH}.homes`]).toBe(fixture.homes)
      expect(draft.sections[`suburb.${NORTH}.local`]).toBe(fixture.local)
    })

    it('an un-writable area is excluded from the slots finalize demands, not just from the loop', async () => {
      // The reachable path: an operator adds a suburb row by hand in the
      // editor. mergeSuburbRows gives it subdivisions: [], and nothing
      // re-runs the uniqueness gate afterwards. The suburb loop skips it
      // forever. If requiredSlotsFor still demanded its three slots,
      // finalizeDraft would refuse the city permanently with no way out.
      const draft = await loadDraft(KEY)
      const research = draft.research!
      const handAdded: Suburb = {
        name: 'Hand Added',
        slug: 'hand-added',
        subdivisions: [],
        housingCharacter: '',
        neighbors: [],
        conditions: [],
      }
      draft.research = { ...research, suburbs: [...research.suburbs, handAdded] }
      await saveDraft(KEY, draft)

      const slots = stageSlots(draft.research).suburb
      for (const slot of suburbSlots('hand-added')) expect(slots).not.toContain(slot)
      expect(requiredSlotsFor(draft.research)).not.toContain('suburb.hand-added.intro')

      // and the stage still completes for the areas that CAN be written
      await runStage(newClient(), KEY, 'suburb')
      expect((await loadDraft(KEY)).done).toContain('suburb')
    })

    it('runs ONE area when given a slug, leaving the others untouched', async () => {
      const client = newClient()
      await runStage(client, KEY, 'suburb', NORTH)
      const draft = await loadDraft(KEY)

      for (const slot of suburbSlots(NORTH)) expect(draft.sections[slot]).toBeTruthy()
      for (const slot of suburbSlots(MOCK_HOLLOW)) expect(draft.sections[slot]).toBeUndefined()
      expect(client.calls).toEqual([`generate:${MODEL_KEYS.suburb(NORTH)}`])
    })

    it('does NOT mark the stage done until every area is written', async () => {
      await runStage(newClient(), KEY, 'suburb', NORTH)
      expect((await loadDraft(KEY)).done).not.toContain('suburb')

      await runStage(newClient(), KEY, 'suburb', MOCK_HOLLOW)
      expect((await loadDraft(KEY)).done).toContain('suburb')
    })

    it('rejects an area slug this city does not have', async () => {
      await expect(runStage(newClient(), KEY, 'suburb', 'not-a-real-area')).rejects.toThrow(
        /not-a-real-area/,
      )
    })

    it('per-area runs and a whole-stage run reach the same result', async () => {
      await runStage(newClient(), KEY, 'suburb', NORTH)
      await runStage(newClient(), KEY, 'suburb', MOCK_HOLLOW)
      const perArea = await loadDraft(KEY)

      await resetDraft()
      await runStage(newClient(), KEY, 'research')
      await runStage(newClient(), KEY, 'suburb')
      const wholeStage = await loadDraft(KEY)

      for (const slug of [NORTH, MOCK_HOLLOW]) {
        for (const slot of suburbSlots(slug)) {
          expect(perArea.sections[slot]).toBe(wholeStage.sections[slot])
        }
      }
      expect(perArea.done).toEqual(wholeStage.done)
    })

    it('writes genuinely different copy per area, not one blob repeated', async () => {
      await runStage(newClient(), KEY, 'suburb')
      const draft = await loadDraft(KEY)

      expect(draft.sections[`suburb.${NORTH}.intro`]).not.toBe(draft.sections[`suburb.${MOCK_HOLLOW}.intro`])
      expect(draft.sections[`suburb.${NORTH}.homes`]).not.toBe(draft.sections[`suburb.${MOCK_HOLLOW}.homes`])
      expect(draft.sections[`suburb.${NORTH}.local`]).not.toBe(draft.sections[`suburb.${MOCK_HOLLOW}.local`])
    })

    it('skips an area whose three slots are already written, calling the stub only for the rest', async () => {
      // Simulate an earlier attempt that completed North Stubville before a
      // timeout hit on the second area.
      const draft = await loadDraft(KEY)
      const [introSlot, homesSlot, localSlot] = suburbSlots(NORTH)
      draft.sections[introSlot] = 'already written intro'
      draft.sections[homesSlot] = 'already written homes'
      draft.sections[localSlot] = 'already written local'
      await saveDraft(KEY, draft)

      const client = newClient()
      await runStage(client, KEY, 'suburb')

      // Assert on which key was called, not just a count — this is the test
      // that proves the money-saving behaviour actually works.
      expect(client.calls).toEqual([`generate:suburb.${MOCK_HOLLOW}`])

      const after = await loadDraft(KEY)
      expect(after.sections[introSlot]).toBe('already written intro')
      expect(after.sections[homesSlot]).toBe('already written homes')
      expect(after.sections[localSlot]).toBe('already written local')
      expect(after.done).toContain('suburb')
    })

    it('a partial failure mid-loop does not lose already-completed areas, and resuming retries only the failed one', async () => {
      const inner = new StubModelClient(fixtures)
      const flaky: ModelClient = {
      usage: { calls: 0, inputTokens: 0, outputTokens: 0, byModel: {} },
        research: (prompt, key, onEvent) => inner.research(prompt, key, onEvent),
        generate: async (args) => {
          if (args.key === `suburb.${MOCK_HOLLOW}`) {
            throw new Error('simulated transient failure on area two')
          }
          return inner.generate(args)
        },
      }

      await expect(runStage(flaky, KEY, 'suburb')).rejects.toThrow('simulated transient failure')

      const midway = await loadDraft(KEY)
      // North Stubville (the first, successful area) survived the throw
      // that hit on Mock Hollow — redoing a good area to recover a failed
      // one would be exactly the loss this loop exists to prevent.
      for (const slot of suburbSlots(NORTH)) expect(midway.sections[slot]).toBeTruthy()
      for (const slot of suburbSlots(MOCK_HOLLOW)) expect(midway.sections[slot]).toBeUndefined()
      expect(midway.done).not.toContain('suburb')

      const client = newClient()
      await runStage(client, KEY, 'suburb')
      expect(client.calls).toEqual([`generate:suburb.${MOCK_HOLLOW}`])

      const after = await loadDraft(KEY)
      for (const slot of suburbSlots(MOCK_HOLLOW)) expect(after.sections[slot]).toBeTruthy()
      expect(after.done).toContain('suburb')
    })

    it('appends a progress event per area so an operator sees movement across sequential calls', async () => {
      await clearProgress(KEY)
      await runStage(newClient(), KEY, 'suburb')
      const events = await readProgress(KEY)
      const suburbEvents = events.filter((e) => e.stage === 'suburb')
      expect(suburbEvents[0].kind).toBe('start')
      // One 'found' event per area (two kept areas), plus the final 'done'.
      expect(suburbEvents.filter((e) => e.kind === 'found')).toHaveLength(2)
      expect(suburbEvents[suburbEvents.length - 1].kind).toBe('done')
    })

    // Fix round on commit e3de1e8: f624a53 made buildSuburbPrompt throw on
    // subdivisions.length === 0 (a prompt can't honestly say "use at least
    // three of these" over an empty list). The uniqueness gate is supposed
    // to drop such an area before it ever reaches this stage, but if one
    // slips through anyway, the loop must skip just that area rather than
    // deadlocking the whole stage on every retry.
    it('an area with zero researched subdivisions is skipped, not thrown on, and the run still completes', async () => {
      const draft = await loadDraft(KEY)
      draft.research!.suburbs.push({
        name: 'Blank Ridge',
        slug: 'blank-ridge',
        subdivisions: [],
        housingCharacter: '',
        neighbors: [],
        conditions: [],
      })
      await saveDraft(KEY, draft)

      const client = newClient()
      await runStage(client, KEY, 'suburb')

      // No model call was ever made for the unbuildable area.
      expect(client.calls).not.toContain('generate:suburb.blank-ridge')
      // The other two areas were not collateral damage.
      expect(client.calls).toEqual([`generate:suburb.${NORTH}`, `generate:suburb.${MOCK_HOLLOW}`])

      const after = await loadDraft(KEY)
      for (const slot of suburbSlots('blank-ridge')) expect(after.sections[slot]).toBeUndefined()
      for (const slug of [NORTH, MOCK_HOLLOW]) {
        for (const slot of suburbSlots(slug)) expect(after.sections[slot]).toBeTruthy()
      }
      // The stage completed rather than deadlocking on the unbuildable area.
      expect(after.done).toContain('suburb')
    })

    it('names the skipped area in a progress entry', async () => {
      const draft = await loadDraft(KEY)
      draft.research!.suburbs.push({
        name: 'Blank Ridge',
        slug: 'blank-ridge',
        subdivisions: [],
        housingCharacter: '',
        neighbors: [],
        conditions: [],
      })
      await saveDraft(KEY, draft)
      await clearProgress(KEY)

      await runStage(newClient(), KEY, 'suburb')

      const events = await readProgress(KEY)
      const skipEvent = events.find((e) => e.stage === 'suburb' && e.label.includes('Blank Ridge'))
      expect(skipEvent).toBeDefined()
      expect(skipEvent!.label).toMatch(/skipped/)
    })

    // Fix round on commit e3de1e8: the original skip check was
    // `!== undefined`, so a model returning "" for a slot counted as
    // "already written" and would never be retried on a later resume,
    // leaving a permanently blank paragraph live.
    it('a blank (empty-string) slot is treated as unwritten and regenerates on the next run', async () => {
      const draft = await loadDraft(KEY)
      const [introSlot, homesSlot, localSlot] = suburbSlots(NORTH)
      draft.sections[introSlot] = '   ' // whitespace-only — not usable copy
      draft.sections[homesSlot] = 'already written homes'
      draft.sections[localSlot] = 'already written local'
      await saveDraft(KEY, draft)

      const client = newClient()
      await runStage(client, KEY, 'suburb')

      // North Stubville was regenerated despite two of its three slots
      // already holding real text — a blank slot forces the whole area to
      // be redone rather than being silently accepted as done.
      expect(client.calls).toContain(`generate:suburb.${NORTH}`)

      const after = await loadDraft(KEY)
      expect(after.sections[introSlot]).toBeTruthy()
      expect((after.sections[introSlot] as string).trim()).not.toBe('')
    })

    // Verifies the fix-round change did not weaken the existing failure
    // path: a genuine model error (as opposed to the zero-subdivisions
    // precondition, which is now handled separately) must still propagate
    // and still leave 'suburb' out of draft.done. This is the same
    // assertion the pre-existing 'a partial failure mid-loop...' test above
    // makes; re-stated here to confirm it still holds after this fix round.
    it('a genuine (non-precondition) model error still propagates and leaves the stage undone', async () => {
      const inner = new StubModelClient(fixtures)
      const failing: ModelClient = {
      usage: { calls: 0, inputTokens: 0, outputTokens: 0, byModel: {} },
        research: (prompt, key, onEvent) => inner.research(prompt, key, onEvent),
        generate: async (args) => {
          if (args.key === `suburb.${NORTH}`) throw new Error('simulated API error')
          return inner.generate(args)
        },
      }

      await expect(runStage(failing, KEY, 'suburb')).rejects.toThrow('simulated API error')

      const draft = await loadDraft(KEY)
      expect(draft.done).not.toContain('suburb')
      for (const slot of suburbSlots(NORTH)) expect(draft.sections[slot]).toBeUndefined()
    })
  })
})
