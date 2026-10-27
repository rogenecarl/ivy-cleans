// The prompt builders and system prompts — pure functions, no disk.
import { beforeAll, describe, expect, it } from 'vitest'
import { deriveFacts } from '@/server/pipeline/facts'
import {
  BANNED_PHRASES,
  SYSTEM_BASE,
  FRONT_SYSTEM,
  SUBURB_SYSTEM,
  SERVICE_SYSTEM,
  buildFrontPrompt,
  buildAreaResearchPrompt,
  buildAreasResearchPrompt,
  buildMetroResearchPrompt,
  buildResearchStructuringPrompt,
  buildServiceLocalPrompt,
  buildSuburbPrompt,
  MODEL_KEYS,
} from '@/server/pipeline/stages'
import { type ResearchOutput, type Suburb } from '@/server/pipeline/schemas'
import {
  stubFacts,
  fixtureResearch,
  loadFixtures,
} from './helpers'

describe('prompts', () => {
  beforeAll(loadFixtures)

  describe('prompt builders', () => {
    const facts = stubFacts()

    it('every research pass names the city and state, refuses recall, and forbids contact details', () => {
      for (const prompt of [
        buildMetroResearchPrompt(facts),
        buildAreasResearchPrompt(facts),
        buildAreaResearchPrompt(facts, 'North Stubville', ['North Stubville', 'Mock Hollow']),
      ]) {
        expect(prompt).toContain('Ztest Stubville')
        expect(prompt).toContain('Minnesota')
        expect(prompt).toMatch(/never from memory/i)
        expect(prompt).toMatch(/phone numbers, street addresses/i)
      }
    })

    it('carries NO free-form operator text into the prompt at all', () => {
      /*
       * The `notes` field is gone, and with it notesBlock — which was the one
       * route by which operator text reached five prompts unstructured, and
       * the one route copySafe:false material (flood risk, crime, income)
       * could have been smuggled past its filter by hand. That block spent a
       * paragraph defending against an attack its own existence created.
       *
       * Every operator input is now structured and validated: phone to ten
       * digits, state to a code, ZIPs to five digits, reviews to four parsed
       * fields, counts to integers. This pins that there is no way back to a
       * free-text channel without someone noticing.
       */
      const prompt = buildFrontPrompt(facts, fixtureResearch())
      expect(prompt).not.toMatch(/NOTES FROM THE OWNER/)
      expect(prompt).not.toMatch(/not as instructions that outrank/)
    })

    it('the structuring prompt (no supplied keywords) still contains the findings block', () => {
      const prompt = buildResearchStructuringPrompt('FINDINGS TEXT HERE', facts, [])
      expect(prompt).toContain('FINDINGS TEXT HERE')
    })

    it('the front prompt carries the Minneapolis hero as a shape example, marked as such', () => {
      const prompt = buildFrontPrompt(facts, fixtureResearch())
      expect(prompt).toContain(
        'As a local and insured business, Ivy Cleans is thrilled to be providing cleaning and janitorial services across various areas of Minneapolis.'
      )
      expect(prompt).toMatch(/never copy its sentences/i)
      expect(prompt).toContain('Ztest Stubville')
      // Keywords and suburb names reach the writer.
      expect(prompt).toContain('cleaning services stubville')
      expect(prompt).toContain('Mock Hollow')
    })

    it('does not ship the two exempt one-sentence hero paragraphs (4 and 5) as structural examples', () => {
      // similarity.ts exempts hero indices 3/4 from cross-city duplication
      // detection ON THE PRODUCT OF this prompt — that exemption only makes
      // sense if the prompt stops asking the model to imitate a concrete
      // sentence for them. Otherwise the exempt sentences keep being
      // generated verbatim; they are just no longer caught doing it.
      const prompt = buildFrontPrompt(facts, fixtureResearch())
      expect(prompt).not.toContain(
        'Whether it’s your home or business, give our professional cleaning company a call today, request your quote, and put our skills to an effective test!',
      )
      expect(prompt).not.toContain(
        'Call our professional cleaning company Ivy Cleans today, get an estimate of our prices and put us to the test!',
      )
      // The first two paragraphs are still shown as examples.
      expect(prompt).toContain(
        'That is why we hold fast to the notion that our services are the top most in the Minneapolis area.',
      )
      /*
       * Paragraph 3 is NOT shown any more (Abdi's Orlando review, item 8).
       * Orlando, Houston and Miami all wrote "…or workplace? Is there a
       * cleaning project sitting on your list?" — 63 to 70 characters shared
       * across cities — because three short questions converge on the
       * exemplar every time. The prompt now specs the questions instead of
       * showing them.
       */
      expect(prompt).not.toContain('Do you have a mess that needs cleaning?')
      expect(prompt).not.toContain('Do you have any cleaning project on your radar?')
      expect(prompt).toContain('Three questions a homeowner in')
    })


    it('omits the notes block entirely when the operator left notes empty', () => {
      const noNotes = deriveFacts({ city: 'Ztest Stubville', state: 'MN', phoneDigits: '6125550142' })
      expect(buildMetroResearchPrompt(noNotes)).not.toMatch(/NOTES FROM THE OWNER/)
      expect(buildAreasResearchPrompt(noNotes)).not.toMatch(/NOTES FROM THE OWNER/)
      expect(buildFrontPrompt(noNotes, fixtureResearch())).not.toMatch(/NOTES FROM THE OWNER/)
    })
  })

  describe('the ops block', () => {
  const withOps = () =>
    deriveFacts({
      city: 'Ztest Stubville',
      state: 'MN',
      phoneDigits: '6125550142',
      ops: {
        servingSince: '2024-03',
        crewLead: 'Maria',
        homesCleaned: 340,
        zips: ['55401', '55402'],
        reviews: [{ quote: 'They got the grout back.', firstName: 'Dana', area: 'North Stubville' }],
      },
    })

  it('is absent entirely when the operator supplied nothing', () => {
    const bare = deriveFacts({ city: 'Ztest Stubville', state: 'MN', phoneDigits: '6125550142' })
    expect(buildFrontPrompt(bare, fixtureResearch())).not.toMatch(/FACTS ABOUT THIS BRANCH/)
  })

  it('reaches every content prompt, not just one', () => {
    const f = withOps()
    const r = fixtureResearch()
    const suburb = r.suburbs.find((s) => s.subdivisions.length > 0)!
    for (const prompt of [
      buildFrontPrompt(f, r),
      buildSuburbPrompt(f, r, suburb),
      buildServiceLocalPrompt(f, r, 'deep-cleaning'),
    ]) {
      expect(prompt).toMatch(/FACTS ABOUT THIS BRANCH/)
      expect(prompt).toContain('Maria')
      expect(prompt).toContain('340')
    }
  })

  it('quotes a real review verbatim, attributed by first name and area', () => {
    const p = buildFrontPrompt(withOps(), fixtureResearch())
    expect(p).toContain('They got the grout back.')
    expect(p).toContain('Dana, North Stubville')
  })

  it('tells the model not to round the numbers it was given', () => {
    const p = buildFrontPrompt(withOps(), fixtureResearch())
    expect(p).toMatch(/do not round/i)
  })

  it('does NOT put ZIP codes in a content prompt — they render as a list, not prose', () => {
    // ops.zips exists so the operator can state coverage; it is page DATA,
    // and the home page renders it directly. Feeding it to a writing prompt
    // would invite the 27-ZIP sentence the home stage was deleted for.
    const p = buildFrontPrompt(withOps(), fixtureResearch())
    expect(p).not.toContain('55401')
  })

  it('SYSTEM_BASE carves the ops block out of the hard limits', () => {
    // The limits forbid stating staff names and years in business, to stop
    // invention. A fact the owner typed is not invented.
    expect(SYSTEM_BASE).toMatch(/FACTS ABOUT THIS BRANCH/)
    expect(SYSTEM_BASE).toMatch(/exists to stop invention/i)
  })
})

describe('research brief no longer asks for ZIP codes', () => {
  it('drops part (d) — a served-ZIP list is an operator decision, not a search result', () => {
    const f = deriveFacts({ city: 'Ztest Stubville', state: 'MN', phoneDigits: '6125550142' })
    for (const p of [buildMetroResearchPrompt(f), buildAreasResearchPrompt(f), buildAreaResearchPrompt(f, 'A', ['A', 'B'])]) {
      expect(p).not.toMatch(/ZIP/i)
    }
  })
})

describe('empty keyword list', () => {
  it('omits the search-phrase section rather than emitting a bare header', () => {
    const f = deriveFacts({ city: 'Ztest Stubville', state: 'MN', phoneDigits: '6125550142' })
    const noKeywords = { ...fixtureResearch(), keywords: [] }
    expect(buildFrontPrompt(f, noKeywords)).not.toMatch(/SEARCH PHRASES/)
    // and still present when there ARE keywords
    expect(buildFrontPrompt(f, fixtureResearch())).toMatch(/SEARCH PHRASES/)
  })
})

describe('SYSTEM_BASE voice', () => {
  it('no longer points the model at the copy that does not rank', () => {
    // The old guide named two live Minneapolis sentences as the target
    // register. The model followed it faithfully -- Houston came back as
    // "we can assertively declare that our standard of work is unmatched"
    // -- from a page sitting at position 33.
    // The phrases still appear -- on the BANNED list. What must be gone is
    // the framing that held them up as the register to imitate.
    expect(SYSTEM_BASE).not.toMatch(/tone to hit is the tone of sentences/i)
    expect(SYSTEM_BASE).not.toMatch(/business ethos is unmatched/i)
    expect(SYSTEM_BASE).not.toMatch(/slightly old-fashioned confidence/i)

    // and where they do appear, it is after the BANNED marker, not before it
    const banned = SYSTEM_BASE.indexOf('BANNED')
    expect(banned).toBeGreaterThan(-1)
    expect(SYSTEM_BASE.toLowerCase().indexOf('assertively declare')).toBeGreaterThan(banned)
  })

  it('prefers a concrete fact to an adjective', () => {
    expect(SYSTEM_BASE).toMatch(/Prefer a fact to an adjective/i)
  })

  it('carries the banned-phrase list, built from the shared constant', () => {
    expect(SYSTEM_BASE).toMatch(/BANNED/)
    for (const phrase of BANNED_PHRASES) {
      expect(SYSTEM_BASE.toLowerCase()).toContain(phrase.toLowerCase())
    }
  })

  it('bans the specific tells the old copy actually used', () => {
    for (const p of ['assertively declare', 'unmatched', 'nestled in the heart of', 'look no further']) {
      expect(BANNED_PHRASES).toContain(p)
    }
  })

  // Regression guards: the rewrite must not drop rules the output depends on.
  it('still forbids markdown, bullets and emoji — output goes straight into a <p>', () => {
    expect(SYSTEM_BASE).toMatch(/NEVER bullet points/)
    expect(SYSTEM_BASE).toMatch(/NEVER markdown/)
  })

  it('still pins the brand spelling and the typographic apostrophe', () => {
    expect(SYSTEM_BASE).toMatch(/exactly "Ivy Cleans"/)
    expect(SYSTEM_BASE).toMatch(/U\+2019/)
  })
})

describe('structural examples', () => {
  it('tell the model the example is shape, not voice', () => {
    const facts = deriveFacts({ city: 'Ztest Stubville', state: 'MN', phoneDigits: '6125550142' })
    const p = buildFrontPrompt(facts, fixtureResearch())
    expect(p).toMatch(/length and structure only/i)
    expect(p).toMatch(/voice is not the target/i)
  })
})

describe('the research passes', () => {
    const facts = stubFacts()
    const all = () => [
      buildMetroResearchPrompt(facts),
      buildAreasResearchPrompt(facts),
      buildAreaResearchPrompt(facts, 'North Stubville', ['North Stubville', 'Mock Hollow']),
    ]

    it('the per-area pass asks for subdivisions, about that area only', () => {
      const p = buildAreaResearchPrompt(facts, 'North Stubville', ['North Stubville', 'Mock Hollow'])
      expect(p).toMatch(/SUBDIVISIONS AND DEVELOPMENTS/)
      expect(p).toContain('about North Stubville only')
      expect(p).toContain('Mock Hollow')
    })

    it('the areas pass rules out a development being listed as a peer of the area containing it', () => {
      expect(buildAreasResearchPrompt(facts)).toMatch(/not a peer of/i)
    })

    it('the city-wide pass requires every condition to state what it means for cleaning', () => {
      expect(buildMetroResearchPrompt(facts)).toMatch(/what it MEANS for cleaning/)
    })

    it('none of them ask for landmarks or keywords', () => {
      for (const p of all()) {
        expect(p).not.toMatch(/LANDMARKS/)
        expect(p).not.toMatch(/KEYWORDS/)
      }
    })
  })

  describe('buildResearchStructuringPrompt', () => {
    const facts = stubFacts()

    it('with no supplied keywords, asks for an empty list rather than invented phrases', () => {
      const prompt = buildResearchStructuringPrompt('findings text', facts, [])
      expect(prompt).toMatch(/keywords — return an empty array/)
      expect(prompt).not.toMatch(/use exactly this list, unchanged/)
    })

    it('with a supplied keyword list, instructs the model to use it unchanged and includes it', () => {
      const prompt = buildResearchStructuringPrompt('findings text', facts, ['house cleaning katy tx'])
      expect(prompt).toMatch(/use exactly this list, unchanged/)
      expect(prompt).toContain('house cleaning katy tx')
    })

    it('instructs a bare <area> slug, no prefix or suffix', () => {
      const prompt = buildResearchStructuringPrompt('findings', facts, [])
      expect(prompt).toMatch(/Nothing else: no prefix, no suffix/)
    })
  })

  describe('buildSuburbPrompt', () => {
    const facts = stubFacts()

    // Two areas so siblings exist, and Katy carries a copySafe:false condition
    // with a distinctive string — a flood-pool fact collected to judge
    // whether Katy is a workable market, never to print on its page.
    const katy: Suburb = {
      name: 'Katy',
      slug: 'katy',
      subdivisions: ['Cinco Ranch', 'Firethorne'],
      housingCharacter: 'Master-planned, built 2000 onward, 2,400-3,400 sq ft, tile and LVP.',
      neighbors: [],
      conditions: [
        { condition: 'Construction nearby', implication: 'Fine grit on sills and blinds', copySafe: true },
        { condition: 'Barker Reservoir flood pool', implication: 'Background only — never for customer copy', copySafe: false },
      ],
    }
    const sugarLand: Suburb = {
      name: 'Sugar Land',
      slug: 'sugar-land',
      subdivisions: ['Telfair', 'Riverstone'],
      housingCharacter: 'Master-planned communities, built 1990s onward.',
      neighbors: [],
      conditions: [],
    }
    const research: ResearchOutput = {
      suburbs: [katy, sugarLand],
      conditions: [{ condition: 'Gulf humidity', implication: 'Grout and shower glass discolour faster', copySafe: true }],
      zips: ['77494'],
      keywords: ['house cleaning katy tx'],
    }

    it('lists only this area’s subdivisions and forbids adding any', () => {
      const p = buildSuburbPrompt(facts, research, katy)
      expect(p).toContain('Cinco Ranch')
      expect(p).toMatch(/never add one/)
    })

    // The load-bearing test: a copySafe:false condition is flood risk, crime
    // or income data, collected only to judge whether a market is workable.
    // If its text reaches the prompt at all, that is the single worst failure
    // this system can produce, so this asserts on the distinctive string
    // rather than on any summary of the filtering logic.
    it('never leaks a copySafe:false condition into the prompt', () => {
      const p = buildSuburbPrompt(facts, research, katy)
      expect(p).not.toContain('Barker Reservoir')
    })

    it('asks for only as many subdivisions as were actually researched', () => {
      /*
       * Katy has two. Asking for "at least three of these by name" while
       * listing two is an impossible instruction, and an impossible
       * instruction is an invitation to invent the third — the exact failure
       * this whole change exists to close off. scoreSuburbs only rejects an
       * area with ZERO subdivisions outright, so one- and two-subdivision
       * areas do reach this prompt.
       */
      expect(buildSuburbPrompt(facts, research, katy)).toMatch(/at least two of these by name/)
      const rich = { ...katy, subdivisions: ['Cinco Ranch', 'Firethorne', 'Seven Meadows'] }
      expect(buildSuburbPrompt(facts, { ...research, suburbs: [rich, sugarLand] }, rich)).toMatch(
        /at least three of these by name/,
      )
    })

    it('names the sibling areas and forbids copy that would fit them', () => {
      const p = buildSuburbPrompt(facts, research, katy)
      expect(p).toContain('Sugar Land')
      expect(p).toMatch(/would sit equally well/)
    })

    it('leads with area-specific conditions before metro-wide ones', () => {
      const p = buildSuburbPrompt(facts, research, katy)
      expect(p.indexOf('Construction nearby')).toBeLessThan(p.indexOf('Gulf humidity'))
    })

    it('asks for exactly the three paragraphs intro, homes, local', () => {
      const p = buildSuburbPrompt(facts, research, katy)
      expect(p).toMatch(/1\. intro —/)
      expect(p).toMatch(/2\. homes —/)
      expect(p).toMatch(/3\. local —/)
    })

    it('MODEL_KEYS.suburb(slug) is keyed per area, distinct for each slug', () => {
      expect(MODEL_KEYS.suburb('katy')).not.toBe(MODEL_KEYS.suburb('sugar-land'))
      expect(MODEL_KEYS.suburb('katy')).toBe('suburb.katy')
    })

    // Fix round 1: an area with no subdivisions cannot honestly fill "Use at
    // least three of these by name" — the gate (scoreSuburbs) is supposed to
    // skip it before it gets here, but this throw is the defensive backstop
    // that makes the contradictory prompt unbuildable even if that gate is
    // ever bypassed.
    it('throws for an area with no subdivisions, rather than emitting a header with nothing under it', () => {
      const noSubdivisions: Suburb = { ...katy, subdivisions: [] }
      expect(() => buildSuburbPrompt(facts, research, noSubdivisions)).toThrow(/subdivisions/i)
    })

    it('omits the "WHAT THE HOMES HERE ARE LIKE" header when housingCharacter is empty', () => {
      const noHousing: Suburb = { ...katy, housingCharacter: '' }
      const p = buildSuburbPrompt(facts, research, noHousing)
      expect(p).not.toContain('WHAT THE HOMES HERE ARE LIKE')
    })

    it('omits the "LOCAL CONDITIONS" header when every condition is copySafe:false', () => {
      const unsafeOnly: Suburb = {
        ...katy,
        conditions: [{ condition: 'Barker Reservoir flood pool', implication: 'n/a', copySafe: false }],
      }
      const noMetroConditions: ResearchOutput = { ...research, conditions: [] }
      const p = buildSuburbPrompt(facts, noMetroConditions, unsafeOnly)
      expect(p).not.toContain('LOCAL CONDITIONS')
    })
  })

  describe('system prompts', () => {
    it('every stage system prompt starts with the identical shared base (cache-prefix ready)', () => {
      for (const system of [FRONT_SYSTEM, SUBURB_SYSTEM, SERVICE_SYSTEM]) {
        expect(system.startsWith(SYSTEM_BASE)).toBe(true)
        expect(system.length).toBeGreaterThan(SYSTEM_BASE.length)
      }
    })

    it('the shared base states the brand, the apostrophe rule and the no-invention limits', () => {
      expect(SYSTEM_BASE).toContain('Ivy Cleans')
      expect(SYSTEM_BASE).toContain('’')
      expect(SYSTEM_BASE).toMatch(/NEVER state or invent a phone number/)
      expect(SYSTEM_BASE).toMatch(/NEVER bullet points/)
    })
  })

  // suburb and service are the two stages that make more than one model call
  // — one per kept area, one per template service — so they are the two that
  // must be resumable INSIDE themselves rather than just at the runStage/
  // regenerateStage level tested above. These tests run 'research' first
  // (real stage, real gate) so the two kept Stubville areas (Fixture Heights
  // is a 'skip' verdict — see 'full stub run' above) drive the loop.
  describe('buildServiceLocalPrompt', () => {
    const facts = stubFacts()

    const research: ResearchOutput = {
      suburbs: [],
      conditions: [
        { condition: 'Gulf humidity', implication: 'Grout and shower glass discolour faster', copySafe: true },
        { condition: 'Barker Reservoir flood pool', implication: 'Background only — never for customer copy', copySafe: false },
      ],
      zips: [],
      keywords: [],
    }

    it('names the service and the city, and forbids repeating the shared copy', () => {
      const p = buildServiceLocalPrompt(facts, research, 'airbnb-cleaning')
      expect(p).toContain('Airbnb')
      expect(p).toContain(facts.city)
      expect(p).toMatch(/Do not repeat/i)
    })

    it('never leaks a copySafe:false condition into the prompt', () => {
      // Same load-bearing rule as buildSuburbPrompt: flood risk, crime and
      // income are collected to judge a market, never to print on a page.
      const p = buildServiceLocalPrompt(facts, research, 'airbnb-cleaning')
      expect(p).not.toContain('Barker Reservoir')
      expect(p).toContain('Gulf humidity')
    })

    it('OMITS the conditions section entirely when none are copySafe', () => {
      /*
       * A header with nothing under it reads to the model as missing data it
       * should supply. That is exactly what made the first real Houston run
       * close every area page on invented humidity and pollen. Same rule as
       * buildSuburbPrompt's housingSection/conditionsSection.
       */
      const bare: ResearchOutput = { ...research, conditions: [] }
      const p = buildServiceLocalPrompt(facts, bare, 'airbnb-cleaning')
      expect(p).not.toMatch(/LOCAL CONDITIONS/)
    })

    it('carries the operator market facts in', () => {
      const withOps = { ...facts, ops: { crewLead: 'Maria' } }
      expect(buildServiceLocalPrompt(withOps, research, 'deep-cleaning')).toContain('Maria')
    })

    it('asks for an honest short answer rather than padding', () => {
      const p = buildServiceLocalPrompt(facts, research, 'standard-cleaning')
      expect(p).toMatch(/90 to 130 words/)
      expect(p).toMatch(/rather than padding/)
    })

    it('CAPS how many conditions may be used, so six service pages do not converge', () => {
      /*
       * Measured on the first real Houston run: four of the six sections
       * worked through all four metro conditions in the same order, with
       * near-identical noun lists, and one shared a 61-character run — over
       * the 60-char floor check-duplication.mjs uses between cities. Shingle
       * similarity passed comfortably (0.054 against a 0.75 threshold),
       * because the wording varied and the substance did not.
       *
       * The two best sections were the two that used the FEWEST conditions.
       * Every service gets the identical metro list — only the service name
       * differs — so without a cap the safe move is to cover everything.
       */
      const p = buildServiceLocalPrompt(facts, research, 'standard-cleaning')
      expect(p).toMatch(/at most two/i)
      expect(p).toMatch(/ignore the rest/i)
    })

    it('refuses a service that does not render through the shared template', () => {
      // move-in-move-out-cleaning is the registry's bespoke entry and has no
      // slot; asking for one would write copy nothing ever renders.
      expect(() => buildServiceLocalPrompt(facts, research, 'move-in-move-out-cleaning')).toThrow(
        /move-in-move-out-cleaning/,
      )
    })
  })
})
