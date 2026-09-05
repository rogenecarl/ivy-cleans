// tests/drafts.test.ts
/*
 * TDD for the admin pipeline's draft sidecar store (src/content/drafts.ts):
 * CRUD on content/_drafts/<key>.json, finalizeDraft (assemble + validate +
 * publish to content/<key>.json + append _cities.json), and publishCity
 * (flip status live, wire a domain host, drop the sidecar).
 *
 * All keys used here are prefixed `ztest-` and removed in afterAll. _cities.json
 * and _domains.json are snapshotted before the suite runs and restored
 * byte-identical afterward, since finalize/publish mutate both files in place.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  createDraft,
  deleteDraft,
  draftKeyFor,
  finalizeDraft,
  listDrafts,
  loadDraft,
  publishCity,
  REQUIRED_SLOTS,
  saveDraft,
  type DraftDoc,
} from '../src/content/drafts'
import { deriveFacts } from '../src/pipeline/facts'
import { getCity, listLiveCityKeys, revalidateCity } from '../src/content/store'
import { validateCityContent } from '../src/content/validate'
import type { ResearchOutput } from '../src/pipeline/schemas'
import { STAGE_IDS } from '../src/content/slots'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const DRAFTS_DIR = path.join(CONTENT_DIR, '_drafts')
const CITIES_JSON = path.join(CONTENT_DIR, '_cities.json')
const DOMAINS_JSON = path.join(CONTENT_DIR, '_domains.json')

function draftPath(key: string): string {
  return path.join(DRAFTS_DIR, `${key}.json`)
}
function cityPath(key: string): string {
  return path.join(CONTENT_DIR, `${key}.json`)
}

const ALL_TEST_KEYS = [
  'ztest-draftville',
  'ztest-conflict-city',
  'ztest-finalizeme',
  'ztest-incomplete',
  'ztest-blankslot',
  'ztest-publishme',
  'ztest-guardville',
  'ztest-republish',
  'ztest-driftville',
  'ztest-progressme',
  'ztest-dupe-a',
  'ztest-dupe-b',
  'ztest-quality',
]

function progressPath(key: string): string {
  return path.join(DRAFTS_DIR, `${key}.progress.json`)
}

function fullResearch(): ResearchOutput {
  return {
    suburbs: [
      {
        name: 'North Ztest',
        slug: 'house-cleaning-north-ztest',
        subdivisions: ['Ztest Commons', 'Ztest Heights'],
        housingCharacter: 'Mostly split-level ranch homes from the 1970s.',
        conditions: [],
      },
    ],
    conditions: [],
    zips: ['00001', '00002'],
    keywords: ['cleaning services ztest'],
  }
}

// Every finalizeDraft-based test below uses fullResearch() paired with
// fullSections(): requiredSlotsFor(fullResearch()) is the static 8, PLUS the
// three suburb.house-cleaning-north-ztest.* slots (Task 18), PLUS one
// service.<slug>.local per template service (content-strategy C) -- so this
// must carry all of them or finalizeDraft's missing-slot check refuses the
// draft. The service slots do NOT depend on research: the same seven services
// exist in every city, so all six are owed from the moment a draft exists.
function fullSections(): Record<string, string | string[]> {
  return {
    'services.heroParagraphs': ['Hero one.', 'Hero two.'],
    'services.serviceIntro': ['Intro one.'],
    'services.cards.dusting': 'Dusting copy.',
    'services.cards.vacuuming': 'Vacuuming copy.',
    'services.cards.bathroom': 'Bathroom copy.',
    'services.cards.window': 'Window copy.',
    'services.cards.upholstery': 'Upholstery copy.',
    'deep.whatIs': 'Deep cleaning is...',
    'suburb.house-cleaning-north-ztest.intro': 'North Ztest is a quiet area we clean often.',
    // Names both researched subdivisions: checkQuality (content-strategy D)
    // requires an area page to name min(3, subdivisions.length) of its own,
    // so a fixture that named none would stand for a city publish correctly
    // refuses.
    'suburb.house-cleaning-north-ztest.homes':
      'Ztest Commons and Ztest Heights are split-level ranches from the 1970s.',
    'suburb.house-cleaning-north-ztest.local': 'Ztest winters mean salt and grit track in all season.',
    'service.standard-cleaning.local': 'A standard visit in Ztest starts with the entry mats.',
    'service.deep-cleaning.local': 'Deep cleans in Ztest begin in the bathrooms.',
    'service.apartment-cleaning.local': 'Ztest apartment work is dominated by shared stairwells.',
    'service.airbnb-cleaning.local': 'Ztest turnovers run tight against the winter arrivals.',
    'service.post-construction-cleaning.local': 'Ztest post-construction work is a dust problem first.',
    'service.pre-listing-cleaning.local': 'A Ztest pre-listing clean is aimed at the windows.',
  }
}

describe('drafts store', () => {
  let citiesSnapshot: string
  let domainsSnapshot: string

  beforeAll(async () => {
    citiesSnapshot = await readFile(CITIES_JSON, 'utf-8')
    domainsSnapshot = await readFile(DOMAINS_JSON, 'utf-8')
  })

  afterAll(async () => {
    // Belt-and-suspenders cleanup in case an assertion threw mid-test.
    await Promise.all(ALL_TEST_KEYS.map((key) => rm(draftPath(key), { force: true })))
    await Promise.all(ALL_TEST_KEYS.map((key) => rm(cityPath(key), { force: true })))
    await writeFile(CITIES_JSON, citiesSnapshot, 'utf-8')
    await writeFile(DOMAINS_JSON, domainsSnapshot, 'utf-8')
    ALL_TEST_KEYS.forEach((key) => revalidateCity(key))

    // Confirm no leftovers in content/.
    const { readdir } = await import('node:fs/promises')
    const entries = await readdir(CONTENT_DIR)
    for (const key of ALL_TEST_KEYS) {
      expect(entries).not.toContain(`${key}.json`)
    }
  })

  describe('draftKeyFor', () => {
    it('slugifies a city name the same way citySlug does', () => {
      expect(draftKeyFor('Ztest Draftville')).toBe('ztest-draftville')
    })
  })

  describe('CRUD round trip', () => {
    const key = 'ztest-draftville'

    afterAll(async () => {
      await rm(draftPath(key), { force: true })
    })

    it('createDraft writes a sidecar and returns its key', async () => {
      const facts = deriveFacts({ city: 'Ztest Draftville', state: 'MN', phoneDigits: '6125550100' })
      const returnedKey = await createDraft(facts)
      expect(returnedKey).toBe(key)

      const doc = await loadDraft(key)
      expect(doc.facts.city).toBe('Ztest Draftville')
      expect(doc.sections).toEqual({})
      expect(doc.done).toEqual([])
      expect(typeof doc.createdAt).toBe('string')
      expect(new Date(doc.createdAt).toISOString()).toBe(doc.createdAt)
    })

    it('listDrafts includes the created draft', async () => {
      const drafts = await listDrafts()
      const found = drafts.find((d) => d.key === key)
      expect(found).toBeDefined()
      expect(found?.city).toBe('Ztest Draftville')
      expect(found?.done).toEqual([])
    })

    it('saveDraft persists mutations round-trippable via loadDraft', async () => {
      const doc = await loadDraft(key)
      doc.done = ['research']
      doc.sections['deep.whatIs'] = 'updated copy'
      await saveDraft(key, doc)

      const reloaded = await loadDraft(key)
      expect(reloaded.done).toEqual(['research'])
      expect(reloaded.sections['deep.whatIs']).toBe('updated copy')
    })

    it('deleteDraft removes the sidecar; loadDraft then throws unknown-draft', async () => {
      await deleteDraft(key)
      await expect(loadDraft(key)).rejects.toThrow(/unknown draft/i)
    })
  })

  describe('createDraft conflicts', () => {
    const key = 'ztest-conflict-city'

    afterAll(async () => {
      await rm(draftPath(key), { force: true })
      await rm(cityPath(key), { force: true })
      revalidateCity(key)
    })

    it('throws if a draft already exists for the key', async () => {
      const facts = deriveFacts({ city: 'Ztest Conflict City', state: 'MN', phoneDigits: '6125550101' })
      await createDraft(facts)
      await expect(createDraft(facts)).rejects.toThrow(/draft already exists/i)
    })

    it('throws if a published city already exists for the key', async () => {
      await rm(draftPath(key), { force: true })

      // Plant a minimal published doc directly (bypassing the pipeline).
      const published = {
        city: 'Ztest Conflict City',
        state: 'MN',
        stateName: 'Minnesota',
        phone: '612-555-0101',
        phoneDisplay: '(612) 555-0101',
        phoneHref: 'tel:6125550101',
        address: '1 Nowhere',
        status: 'live',
        hasSuburbPages: false,
        maps: { front: null, home: null, contact: null },
        research: { suburbs: [], zips: [], conditions: [], mapEmbedUrl: null },
        sections: {},
      }
      await writeFile(cityPath(key), JSON.stringify(published), 'utf-8')

      const facts = deriveFacts({ city: 'Ztest Conflict City', state: 'MN', phoneDigits: '6125550101' })
      await expect(createDraft(facts)).rejects.toThrow(/published city already exists/i)
    })
  })

  describe('finalizeDraft', () => {
    const key = 'ztest-finalizeme'

    afterAll(async () => {
      await rm(draftPath(key), { force: true })
      await rm(cityPath(key), { force: true })
      revalidateCity(key)
    })

    it('assembles, validates, and publishes a complete draft', async () => {
      const facts = deriveFacts({
        city: 'Ztest Finalizeme',
        state: 'MN',
        phoneDigits: '6125550102',
        address: '123 Ztest Ave',
      })
      await createDraft(facts)

      const doc = await loadDraft(key)
      doc.research = fullResearch()
      doc.sections = fullSections()
      doc.done = ['research', 'front', 'home', 'deep']
      await saveDraft(key, doc)

      await finalizeDraft(key)

      const raw = JSON.parse(await readFile(cityPath(key), 'utf-8'))
      const validated = validateCityContent(raw)
      expect(validated.city).toBe('Ztest Finalizeme')
      expect(validated.status).toBe('draft')
      expect(validated.hasSuburbPages).toBe(true)
      expect(validated.maps).toEqual({ front: null, home: null, contact: null })
      expect(validated.contactAddress).toBe('123 Ztest Ave')
      expect(validated.research.zips).toEqual(['00001', '00002'])
      expect(validated.sections['deep.whatIs']).toBe('Deep cleaning is...')
      // The gap Task 18 closes: generated area copy must actually reach the
      // published document instead of being silently dropped at finalize.
      expect(validated.sections['suburb.house-cleaning-north-ztest.intro']).toBe(
        'North Ztest is a quiet area we clean often.',
      )
      expect(validated.sections['suburb.house-cleaning-north-ztest.homes']).toBe(
        'Ztest Commons and Ztest Heights are split-level ranches from the 1970s.',
      )
      expect(validated.sections['suburb.house-cleaning-north-ztest.local']).toBe(
        'Ztest winters mean salt and grit track in all season.',
      )

      const cities = JSON.parse(await readFile(CITIES_JSON, 'utf-8')) as string[]
      expect(cities).toContain(key)

      const resolved = await getCity(key)
      expect(resolved.city).toBe('Ztest Finalizeme')
      // Round-trips through validateCityContent a second time via the store's
      // own read path, not just the raw JSON this test parsed directly.
      expect(resolved.sections['suburb.house-cleaning-north-ztest.homes']).toBe(
        'Ztest Commons and Ztest Heights are split-level ranches from the 1970s.',
      )
    })

    it('refuses to finalize when one area is missing its suburb slots, naming exactly that area', async () => {
      const twoAreaKey = 'ztest-twoarea'
      try {
        const facts = deriveFacts({ city: 'Ztest Twoarea', state: 'MN', phoneDigits: '6125550198' })
        await createDraft(facts)

        const research: ResearchOutput = {
          ...fullResearch(),
          suburbs: [
            ...fullResearch().suburbs,
            {
              name: 'South Ztest',
              slug: 'cleaning-services-south-ztest',
              subdivisions: ['Ztest Meadows'],
              housingCharacter: 'Newer builds on wider lots.',
              conditions: [],
            },
          ],
        }
        const doc = await loadDraft(twoAreaKey)
        doc.research = research
        // fullSections() carries the north-ztest suburb slots but nothing for
        // south-ztest — the missing area.
        doc.sections = fullSections()
        doc.done = ['research', 'front', 'deep']
        await saveDraft(twoAreaKey, doc)

        let caught: Error | undefined
        try {
          await finalizeDraft(twoAreaKey)
        } catch (e) {
          caught = e as Error
        }
        expect(caught).toBeDefined()
        const msg = caught!.message
        expect(msg).toMatch(/suburb\.cleaning-services-south-ztest\.intro/)
        expect(msg).toMatch(/suburb\.cleaning-services-south-ztest\.homes/)
        expect(msg).toMatch(/suburb\.cleaning-services-south-ztest\.local/)
        // The OTHER area's slots, which ARE present, must not be reported missing.
        expect(msg).not.toMatch(/suburb\.house-cleaning-north-ztest/)

        await expect(readFile(cityPath(twoAreaKey), 'utf-8')).rejects.toThrow()
      } finally {
        await rm(draftPath(twoAreaKey), { force: true })
        await rm(cityPath(twoAreaKey), { force: true })
        revalidateCity(twoAreaKey)
      }
    })

    it('finalizes a city with no researched areas at all, degenerating to the research-free slots', async () => {
      const noAreasKey = 'ztest-noareas'
      try {
        const facts = deriveFacts({ city: 'Ztest Noareas', state: 'MN', phoneDigits: '6125550197' })
        await createDraft(facts)

        const doc = await loadDraft(noAreasKey)
        doc.research = { ...fullResearch(), suburbs: [] }
        doc.sections = {
          'services.heroParagraphs': ['Hero one.'],
          'services.serviceIntro': ['Intro one.'],
          'services.cards.dusting': 'Dusting copy.',
          'services.cards.vacuuming': 'Vacuuming copy.',
          'services.cards.bathroom': 'Bathroom copy.',
          'services.cards.window': 'Window copy.',
          'services.cards.upholstery': 'Upholstery copy.',
          'deep.whatIs': 'Deep cleaning is...',
          // Research-independent, like the eight above: the same seven
          // services exist in a city with no areas at all.
          'service.standard-cleaning.local': 'A standard visit here starts with the entry mats.',
          'service.deep-cleaning.local': 'Deep cleans here begin in the bathrooms.',
          'service.apartment-cleaning.local': 'Apartment work here is dominated by shared stairwells.',
          'service.airbnb-cleaning.local': 'Turnovers here run tight against winter arrivals.',
          'service.post-construction-cleaning.local': 'Post-construction work here is a dust problem first.',
          'service.pre-listing-cleaning.local': 'A pre-listing clean here is aimed at the windows.',
        }
        doc.done = ['research', 'front', 'deep', 'service']
        await saveDraft(noAreasKey, doc)

        await finalizeDraft(noAreasKey)

        const validated = validateCityContent(JSON.parse(await readFile(cityPath(noAreasKey), 'utf-8')))
        expect(validated.research.suburbs).toEqual([])
        expect(Object.keys(validated.sections).sort()).toEqual(
          [...REQUIRED_SLOTS].sort(),
        )
      } finally {
        await rm(draftPath(noAreasKey), { force: true })
        await rm(cityPath(noAreasKey), { force: true })
        revalidateCity(noAreasKey)
      }
    })

    it('uses a placeholder address when facts.address is absent, and omits contactAddress', async () => {
      const noAddrKey = 'ztest-noaddr'
      try {
        const facts = deriveFacts({ city: 'Ztest Noaddr', state: 'MN', phoneDigits: '6125550199' })
        await createDraft(facts)
        const doc = await loadDraft(noAddrKey)
        doc.research = fullResearch()
        doc.sections = fullSections()
        doc.done = ['research', 'front', 'home', 'deep']
        await saveDraft(noAddrKey, doc)

        await finalizeDraft(noAddrKey)

        const raw = JSON.parse(await readFile(cityPath(noAddrKey), 'utf-8'))
        const validated = validateCityContent(raw)
        expect(validated.address).toBe('Ztest Noaddr — address pending')
        expect(validated.contactAddress).toBeUndefined()
      } finally {
        await rm(draftPath(noAddrKey), { force: true })
        await rm(cityPath(noAddrKey), { force: true })
        revalidateCity(noAddrKey)
        const cities = JSON.parse(await readFile(CITIES_JSON, 'utf-8')) as string[]
        await writeFile(CITIES_JSON, JSON.stringify(cities.filter((c) => c !== noAddrKey)), 'utf-8')
      }
    })
  })

  describe('finalizeDraft with missing pieces', () => {
    const key = 'ztest-incomplete'

    afterAll(async () => {
      await rm(draftPath(key), { force: true })
      await rm(cityPath(key), { force: true })
      revalidateCity(key)
    })

    it('throws ONE error naming every missing slot and missing research', async () => {
      const facts = deriveFacts({ city: 'Ztest Incomplete', state: 'MN', phoneDigits: '6125550103' })
      await createDraft(facts)

      const doc: DraftDoc = await loadDraft(key)
      // No research assigned; only some sections filled.
      doc.sections = {
        'services.heroParagraphs': ['Hero.'],
        'deep.whatIs': 'Deep copy.',
      }
      await saveDraft(key, doc)

      let caught: Error | undefined
      try {
        await finalizeDraft(key)
      } catch (e) {
        caught = e as Error
      }
      expect(caught).toBeDefined()
      const msg = caught!.message
      expect(msg).toMatch(/research/)
      expect(msg).toMatch(/services\.serviceIntro/)
      expect(msg).toMatch(/services\.cards\.dusting/)
      expect(msg).toMatch(/services\.cards\.vacuuming/)
      expect(msg).toMatch(/services\.cards\.bathroom/)
      expect(msg).toMatch(/services\.cards\.window/)
      expect(msg).toMatch(/services\.cards\.upholstery/)
      // Slots that WERE provided must not be reported missing.
      expect(msg).not.toMatch(/services\.heroParagraphs/)
      expect(msg).not.toMatch(/deep\.whatIs/)

      // Nothing should have been published.
      await expect(readFile(cityPath(key), 'utf-8')).rejects.toThrow()
    })
  })

  describe('finalizeDraft refuses a blank suburb slot', () => {
    const key = 'ztest-blankslot'

    afterAll(async () => {
      await rm(draftPath(key), { force: true })
      await rm(cityPath(key), { force: true })
      revalidateCity(key)
    })

    it('names the blank slot as missing rather than publishing an empty paragraph', async () => {
      const facts = deriveFacts({ city: 'Ztest Blankslot', state: 'MN', phoneDigits: '6125550105' })
      await createDraft(facts)

      const doc: DraftDoc = await loadDraft(key)
      doc.research = fullResearch()
      doc.sections = {
        ...fullSections(),
        // A model returning "" for one suburb slot is `!== undefined` but
        // not real copy — this must refuse, not publish a blank <p>.
        'suburb.house-cleaning-north-ztest.intro': '   ',
      }
      await saveDraft(key, doc)

      await expect(finalizeDraft(key)).rejects.toThrow(
        /sections\.suburb\.house-cleaning-north-ztest\.intro/,
      )

      // Nothing should have been published.
      await expect(readFile(cityPath(key), 'utf-8')).rejects.toThrow()
    })
  })

  describe('publishCity', () => {
    const key = 'ztest-publishme'

    afterAll(async () => {
      await rm(draftPath(key), { force: true })
      await rm(cityPath(key), { force: true })
      revalidateCity(key)
      const domains = JSON.parse(await readFile(DOMAINS_JSON, 'utf-8')) as {
        default: string
        hosts: Record<string, string>
      }
      delete domains.hosts['ztest-domain.example']
      await writeFile(DOMAINS_JSON, JSON.stringify(domains, null, 2), 'utf-8')
    })

    it('flips status to live, adds a domain host, and removes the sidecar', async () => {
      const facts = deriveFacts({
        city: 'Ztest Publishme',
        state: 'MN',
        phoneDigits: '6125550104',
        address: '1 Publish Way',
      })
      await createDraft(facts)
      const doc = await loadDraft(key)
      doc.research = fullResearch()
      doc.sections = fullSections()
      doc.done = ['research', 'front', 'home', 'deep']
      await saveDraft(key, doc)
      await finalizeDraft(key)

      // Sidecar still present right after finalize.
      await expect(readFile(draftPath(key), 'utf-8')).resolves.toBeTruthy()

      await publishCity(key, 'Ztest-Domain.example:3000')

      const raw = JSON.parse(await readFile(cityPath(key), 'utf-8'))
      const validated = validateCityContent(raw)
      expect(validated.status).toBe('live')
      expect(validated.domain).toBe('ztest-domain.example')

      const domains = JSON.parse(await readFile(DOMAINS_JSON, 'utf-8')) as {
        default: string
        hosts: Record<string, string>
      }
      expect(domains.hosts['ztest-domain.example']).toBe(key)

      // Sidecar gone after publish.
      await expect(readFile(draftPath(key), 'utf-8')).rejects.toThrow()

      const resolved = await getCity(key)
      expect(resolved.status).toBe('live')
    })
  })

  describe('publishCity quality guard', () => {
    const KEY = 'ztest-quality'

    afterEach(async () => {
      await rm(draftPath(KEY), { force: true })
      await rm(cityPath(KEY), { force: true })
      revalidateCity(KEY)
    })

    /** A draft that would finalize and publish cleanly, before we spoil it. */
    async function goodDraft(ops?: Record<string, unknown>) {
      const facts = deriveFacts({
        city: 'Ztest Quality',
        state: 'MN',
        phoneDigits: '6125550198',
        ...(ops ? { ops } : {}),
      })
      await createDraft(facts)
      const draft = await loadDraft(KEY)
      draft.research = fullResearch()
      draft.sections = fullSections()
      draft.done = [...STAGE_IDS]
      await saveDraft(KEY, draft)
      await finalizeDraft(KEY)
    }

    it('refuses a city whose area page never names its own subdivisions', async () => {
      await goodDraft()
      // Replace the one paragraph that names them. The prompt required at
      // least two of the two researched here; nothing verified it until now.
      const doc = JSON.parse(await readFile(cityPath(KEY), 'utf-8'))
      doc.sections['suburb.house-cleaning-north-ztest.homes'] =
        'The homes here are lovely and we clean them well.'
      await writeFile(cityPath(KEY), JSON.stringify(doc, null, 2), 'utf-8')
      revalidateCity(KEY)

      await expect(publishCity(KEY)).rejects.toThrow(/names 0 of 2 researched subdivisions/)
    })

    it('refuses a city that was given a crew lead and never mentioned them', async () => {
      // The rule that gives the ops block teeth: a page that received a real
      // fact and ignored it is a failed page.
      await goodDraft({ crewLead: 'Maria' })
      await expect(publishCity(KEY)).rejects.toThrow(/crew lead "Maria"/)
    })

    it('does NOT refuse a banned phrase — it is surfaced, not blocking', async () => {
      await goodDraft()
      const doc = JSON.parse(await readFile(cityPath(KEY), 'utf-8'))
      doc.sections['deep.whatIs'] = 'Look no further: deep cleaning is a thorough service.'
      await writeFile(cityPath(KEY), JSON.stringify(doc, null, 2), 'utf-8')
      revalidateCity(KEY)

      await expect(publishCity(KEY)).resolves.toBeUndefined()
      expect(JSON.parse(await readFile(cityPath(KEY), 'utf-8')).status).toBe('live')
    })
  })

  describe('publishCity duplication guard', () => {
    const keyA = 'ztest-dupe-a'
    const keyB = 'ztest-dupe-b'

    afterAll(async () => {
      await rm(draftPath(keyA), { force: true })
      await rm(cityPath(keyA), { force: true })
      await rm(draftPath(keyB), { force: true })
      await rm(cityPath(keyB), { force: true })
      revalidateCity(keyA)
      revalidateCity(keyB)
    })

    it('publishCity refuses copy that duplicates an already-live city', async () => {
      // Long enough (well over the 60-char verbatim floor) that a byte-for-byte
      // copy is unambiguously a collision rather than a coincidence of short,
      // generic filler text.
      const sharedWhatIs =
        'Deep cleaning reaches the buildup a routine visit skips entirely, from baseboards ' +
        'and window tracks to the tops of doorframes and the backs of every major appliance.'

      const factsA = deriveFacts({ city: 'Ztest Dupe A', state: 'MN', phoneDigits: '6125550110' })
      await createDraft(factsA)
      const docA = await loadDraft(keyA)
      docA.research = fullResearch()
      docA.sections = { ...fullSections(), 'deep.whatIs': sharedWhatIs }
      docA.done = ['research', 'front', 'home', 'deep']
      await saveDraft(keyA, docA)
      await finalizeDraft(keyA)
      await publishCity(keyA)

      // Everything BUT deep.whatIs is deliberately distinct prose, so the
      // rejection can only be attributed to the one slot this test cares about.
      const factsB = deriveFacts({ city: 'Ztest Dupe B', state: 'MN', phoneDigits: '6125550111' })
      await createDraft(factsB)
      const docB = await loadDraft(keyB)
      docB.research = fullResearch()
      docB.sections = {
        ...fullSections(),
        'services.heroParagraphs': ['City B opens with wholly separate hero copy.', 'And a second distinct hero line.'],
        'services.serviceIntro': ['City B has an entirely unrelated service introduction paragraph.'],
        'home.zipParagraph': 'City B serves an unrelated pair of zip codes, 00003 and 00004.',
        'deep.whatIs': sharedWhatIs,
      }
      docB.done = ['research', 'front', 'home', 'deep']
      await saveDraft(keyB, docB)
      await finalizeDraft(keyB)

      await expect(publishCity(keyB)).rejects.toThrow(/deep\.whatIs/)

      // Refused publishes must not have side effects: B stays a draft, and its
      // sidecar (an operator's in-progress work) is not deleted out from under them.
      const validatedB = validateCityContent(JSON.parse(await readFile(cityPath(keyB), 'utf-8')))
      expect(validatedB.status).toBe('draft')
      await expect(readFile(draftPath(keyB), 'utf-8')).resolves.toBeTruthy()
    })
  })

  describe('finalizeDraft over an already-published document', () => {
    /*
     * finalizeDraft rebuilds the whole city document from the draft, so the
     * two fields the draft knows nothing about — `status` and `domain`, both
     * owned by publishCity — have to be carried over from the existing
     * document. Without that, the review screen's "regenerate then finalize"
     * path would silently demote a LIVE city to 'draft' and drop its domain
     * while _domains.json still routed the host here: a real 404 on a real
     * customer domain.
     */
    const key = 'ztest-republish'

    afterAll(async () => {
      await rm(draftPath(key), { force: true })
      await rm(cityPath(key), { force: true })
      revalidateCity(key)
    })

    // The three tests below are one ordered flow over a single key: first
    // finalize, publish, re-finalize.
    it('starts a city that has never been published as a draft', async () => {
      // The carry-forward must not become "assume live": with no existing
      // document there is nothing to inherit and 'draft' is the honest default.
      const facts = deriveFacts({
        city: 'Ztest Republish',
        state: 'MN',
        phoneDigits: '6125550105',
        address: '1 Republish Way',
      })
      await createDraft(facts)
      const doc = await loadDraft(key)
      doc.research = fullResearch()
      doc.sections = fullSections()
      doc.done = ['research', 'front', 'home', 'deep']
      await saveDraft(key, doc)

      await finalizeDraft(key)

      const validated = validateCityContent(JSON.parse(await readFile(cityPath(key), 'utf-8')))
      expect(validated.status).toBe('draft')
      expect(validated.domain).toBeUndefined()
    })

    it('refreshes the copy without demoting the city or dropping its domain', async () => {
      const doc = await loadDraft(key)
      await publishCity(key, 'ztest-republish.example')
      // publishCity retires the sidecar; restore it so the city is in the
      // partial-publish shape this guard exists for (live doc + live sidecar).
      await saveDraft(key, doc)
      expect((await getCity(key)).status).toBe('live')

      const draft = await loadDraft(key)
      draft.sections['deep.whatIs'] = 'Rewritten deep-cleaning copy.'
      await saveDraft(key, draft)

      await finalizeDraft(key)

      const validated = validateCityContent(JSON.parse(await readFile(cityPath(key), 'utf-8')))
      expect(validated.status).toBe('live')
      expect(validated.domain).toBe('ztest-republish.example')
      expect(validated.sections['deep.whatIs']).toBe('Rewritten deep-cleaning copy.')
      // The store must agree — this is what the public site serves.
      expect((await getCity(key)).status).toBe('live')
    })
  })

  describe('publishCity domain drift', () => {
    const key = 'ztest-driftville'

    afterAll(async () => {
      await rm(draftPath(key), { force: true })
      await rm(cityPath(key), { force: true })
      revalidateCity(key)
    })

    function hosts(raw: string): Record<string, string> {
      return (JSON.parse(raw) as { hosts: Record<string, string> }).hosts
    }

    it('retires the previous domain when republished under a new one', async () => {
      const facts = deriveFacts({
        city: 'Ztest Driftville',
        state: 'MN',
        phoneDigits: '6125550106',
        address: '1 Drift Way',
      })
      await createDraft(facts)
      const doc = await loadDraft(key)
      doc.research = fullResearch()
      doc.sections = fullSections()
      doc.done = ['research', 'front', 'home', 'deep']
      await saveDraft(key, doc)
      await finalizeDraft(key)

      await publishCity(key, 'ztest-drift-a.example')
      expect(hosts(await readFile(DOMAINS_JSON, 'utf-8'))['ztest-drift-a.example']).toBe(key)

      await saveDraft(key, doc) // sidecar back, as the admin flow would have it
      await publishCity(key, 'ztest-drift-b.example')

      const after = hosts(await readFile(DOMAINS_JSON, 'utf-8'))
      // The old host is gone — left behind it would keep routing to this city
      // forever, and _domains.json is inlined into the proxy bundle so nothing
      // at runtime would ever notice.
      expect(after['ztest-drift-a.example']).toBeUndefined()
      expect(after['ztest-drift-b.example']).toBe(key)
      expect(validateCityContent(JSON.parse(await readFile(cityPath(key), 'utf-8'))).domain).toBe(
        'ztest-drift-b.example',
      )
    })

    it('leaves OTHER cities mappings alone', async () => {
      // Only entries pointing at THIS key may be cleared: clearing by host
      // value alone would let one city's publish unmap a different tenant.
      const domains = JSON.parse(await readFile(DOMAINS_JSON, 'utf-8')) as {
        default: string
        hosts: Record<string, string>
      }
      domains.hosts['ztest-someone-else.example'] = 'minneapolis'
      await writeFile(DOMAINS_JSON, JSON.stringify(domains, null, 2), 'utf-8')

      await publishCity(key, 'ztest-drift-c.example')

      const after = hosts(await readFile(DOMAINS_JSON, 'utf-8'))
      expect(after['ztest-someone-else.example']).toBe('minneapolis')
      expect(after['ztest-drift-c.example']).toBe(key)
      expect(after['ztest-drift-b.example']).toBeUndefined()
    })

    it('publishing with a blank domain preserves the domain already set', async () => {
      // The publish box submits nothing when the operator leaves the box
      // empty; re-publishing must not un-map a live city.
      const before = hosts(await readFile(DOMAINS_JSON, 'utf-8'))

      await publishCity(key)

      const validated = validateCityContent(JSON.parse(await readFile(cityPath(key), 'utf-8')))
      expect(validated.status).toBe('live')
      expect(validated.domain).toBe('ztest-drift-c.example')
      expect(hosts(await readFile(DOMAINS_JSON, 'utf-8'))).toEqual(before)
    })
  })

  describe('progress sidecar cleanup', () => {
    const key = 'ztest-progressme'

    afterAll(async () => {
      await rm(draftPath(key), { force: true })
      await rm(cityPath(key), { force: true })
      await rm(progressPath(key), { force: true })
      await rm(path.join(DRAFTS_DIR, 'somecity.progress.json'), { force: true })
      revalidateCity(key)
    })

    it('listDrafts ignores .progress.json sidecars', async () => {
      await writeFile(path.join(process.cwd(), 'content/_drafts/somecity.progress.json'), '[]', 'utf-8')
      const keys = (await listDrafts()).map((d) => d.key)
      expect(keys).not.toContain('somecity.progress')
    })

    it('deleteDraft removes the progress file too', async () => {
      const facts = deriveFacts({ city: 'Ztest Progressme', state: 'MN', phoneDigits: '6125550107' })
      await createDraft(facts)
      await writeFile(progressPath(key), '[]', 'utf-8')

      await deleteDraft(key)

      await expect(readFile(draftPath(key), 'utf-8')).rejects.toThrow()
      await expect(readFile(progressPath(key), 'utf-8')).rejects.toThrow()
    })

    it('publishCity removes the progress file too', async () => {
      const facts = deriveFacts({
        city: 'Ztest Progressme',
        state: 'MN',
        phoneDigits: '6125550107',
        address: '1 Progress Way',
      })
      await createDraft(facts)
      const doc = await loadDraft(key)
      doc.research = fullResearch()
      doc.sections = fullSections()
      doc.done = ['research', 'front', 'home', 'deep']
      await saveDraft(key, doc)
      await finalizeDraft(key)
      await writeFile(progressPath(key), '[]', 'utf-8')

      await publishCity(key)

      await expect(readFile(progressPath(key), 'utf-8')).rejects.toThrow()
    })
  })

  describe('listLiveCityKeys guard against content/_drafts/', () => {
    const key = 'ztest-guardville'

    beforeAll(async () => {
      const { mkdir } = await import('node:fs/promises')
      await mkdir(DRAFTS_DIR, { recursive: true })
      await writeFile(draftPath(key), JSON.stringify({ facts: {}, sections: {}, done: [], createdAt: '' }), 'utf-8')
    })

    afterAll(async () => {
      await rm(draftPath(key), { force: true })
    })

    it('does not throw and still returns exactly the live cities with a populated _drafts dir present', async () => {
      await expect(listLiveCityKeys()).resolves.not.toThrow
      const keys = await listLiveCityKeys()
      expect(keys).toEqual(['minneapolis'])
    })
  })

  /*
   * Task 13 Part B. content/_drafts/houston.json and miami.json are real,
   * in-progress operator drafts (not ztest- fixtures) that were written
   * before this branch added subdivisions/housingCharacter/conditions to
   * Suburb and conditions to ResearchOutput. loadDraft does not zod-validate,
   * so resuming either one silently carried the old shape all the way to
   * finalizeDraft, which then wrote `conditions: undefined` into
   * research.suburbs[] -- rejected by validateCityContent, but only at the
   * very last step. The sidecars were migrated by hand (empty arrays, since
   * nothing was actually researched under the new brief); this is the proof
   * that resuming them now works, not an assumption that the migration was
   * enough.
   *
   * These touch real content/<key>.json files this suite does not otherwise
   * own, so each case snapshots and restores its city document byte-for-byte
   * rather than leaving finalizeDraft's rewrite in place. The draft sidecar
   * (content/_drafts/<key>.json) is snapshotted and restored the same way,
   * since Task 18 requires this test to mutate it (see below).
   *
   * Task 18: finalizeDraft now requires requiredSlotsFor(draft.research),
   * which includes three suburb.<slug>.* slots per area in research.suburbs
   * — and every area in these two hand-migrated drafts carries zero
   * subdivisions (nothing was actually researched under the new brief). Had
   * these drafts gone through the research stage under the current code,
   * the uniqueness gate (Task 16, scoreSuburbs) would have given every one
   * of them a 'skip' verdict and dropped it from research.suburbs outright
   * — a zero-subdivision area can never honestly get an area page (see
   * buildSuburbPrompt's own throw for exactly that case). So this test
   * empties research.suburbs before finalizing, applying by hand the same
   * verdict the gate would have reached, rather than leaving stale
   * placeholder areas that Task 18 can now never let through.
   */
  describe('resuming the migrated houston/miami draft sidecars', () => {
    it.each(['houston', 'miami'] as const)(
      'loadDraft then finalizeDraft does not throw for the resumable %s draft',
      async (key) => {
        const before = await readFile(cityPath(key), 'utf-8')
        const draftBefore = await readFile(draftPath(key), 'utf-8')
        try {
          const draft = await loadDraft(key)
          expect(draft.research).toBeDefined()
          // Assert the migrated SHAPE, not a snapshot of its contents. These
          // sidecars started with empty researched fields, but a city can be
          // re-researched at any time -- Houston has been -- and this test is
          // about whether a migrated sidecar loads and finalizes, not about
          // what a particular run happened to find.
          expect(draft.research!.suburbs.length).toBeGreaterThan(0)
          for (const s of draft.research!.suburbs) {
            expect(Array.isArray(s.subdivisions)).toBe(true)
            expect(typeof s.housingCharacter).toBe('string')
            expect(Array.isArray(s.conditions)).toBe(true)
          }
          expect(Array.isArray(draft.research!.conditions)).toBe(true)
          expect('landmarks' in draft.research!).toBe(false)

          // Supply the copy this test needs rather than depending on whatever
          // state the real draft happens to be in. These sidecars are live
          // working files -- regenerating a stage legitimately clears the ones
          // downstream of it -- so a test that assumed a complete draft would
          // break every time someone actually used the pipeline.
          draft.research!.suburbs = []
          draft.sections = { ...fullSections(), ...draft.sections }
          await saveDraft(key, draft)

          await finalizeDraft(key)

          const validated = validateCityContent(JSON.parse(await readFile(cityPath(key), 'utf-8')))
          expect(validated.city).toBe(draft.facts.city)
          // The pre-migration shape (`landmarks`, no top-level `conditions`,
          // suburbs missing subdivisions/housingCharacter/conditions) would
          // have failed validateCityContent before this line -- reaching it
          // is most of the proof that the migration actually worked.
          // suburbs were emptied above, so the published document carries the
          // migrated shape with no areas -- the point is that it VALIDATES.
          expect(Array.isArray(validated.research.conditions)).toBe(true)
          expect(validated.research.suburbs).toEqual([])
          expect('landmarks' in validated.research).toBe(false)
        } finally {
          await writeFile(cityPath(key), before, 'utf-8')
          await writeFile(draftPath(key), draftBefore, 'utf-8')
          revalidateCity(key)
        }
      },
    )
  })
})
