// tests/quality.test.ts
/*
 * The quality validators — content-strategy item D.
 *
 * similarity.ts asks "is this copy the same as some other city's". These ask
 * the different question: "did the copy do the job the prompt gave it".
 * Every check is mechanical and reads only the finished document, so it runs
 * at publish, where the draft sidecar is already gone.
 */
import { describe, expect, it } from 'vitest'
import { BANNED_PHRASES, checkQuality } from '../src/content/quality'
import type { CityContent, MarketOps, Suburb } from '../src/content/types'

function suburb(over: Partial<Suburb> = {}): Suburb {
  return {
    name: 'Katy',
    slug: 'katy',
    subdivisions: ['Cinco Ranch', 'Firethorne', 'Seven Meadows', 'Kelliwood'],
    housingCharacter: 'Master-planned, built 2000 onward.',
    conditions: [],
    ...over,
  }
}

function doc(over: {
  suburbs?: Suburb[]
  sections?: Record<string, string | string[]>
  ops?: MarketOps
}): CityContent {
  return {
    city: 'Houston',
    state: 'TX',
    stateName: 'Texas',
    phone: '713-555-0142',
    phoneDisplay: '(713) 555-0142',
    phoneHref: 'tel:7135550142',
    address: '1 Test St',
    status: 'draft',
    hasSuburbPages: true,
    maps: { front: null, home: null, contact: null },
    research: {
      suburbs: over.suburbs ?? [],
      zips: [],
      conditions: [],
      mapEmbedUrl: null,
    },
    sections: over.sections ?? {},
    ...(over.ops ? { ops: over.ops } : {}),
  }
}

/** The three slots one area page is assembled from. */
function areaCopy(slug: string, text: string): Record<string, string> {
  return {
    [`suburb.${slug}.intro`]: text,
    [`suburb.${slug}.homes`]: text,
    [`suburb.${slug}.local`]: text,
  }
}

describe('entity coverage', () => {
  it('passes an area page that names three of its own subdivisions', () => {
    const c = doc({
      suburbs: [suburb()],
      sections: areaCopy('katy', 'We clean in Cinco Ranch, Firethorne and Seven Meadows.'),
    })
    expect(checkQuality(c)).toEqual([])
  })

  it('FAILS an area page that names fewer than three, and says how many it found', () => {
    /*
     * The load-bearing check. buildSuburbPrompt requires at least three real
     * developments by name, because that is the single strongest signal a
     * page has that it is about one place rather than any place. Nothing
     * verified the model complied.
     */
    const c = doc({
      suburbs: [suburb()],
      sections: areaCopy('katy', 'We clean homes in Cinco Ranch and across the west side.'),
    })
    const findings = checkQuality(c)
    expect(findings).toHaveLength(1)
    expect(findings[0].rule).toBe('entity-coverage')
    expect(findings[0].slot).toBe('suburb.katy')
    expect(findings[0].blocking).toBe(true)
    expect(findings[0].detail).toMatch(/1 of 4/)
  })

  it('matches a subdivision name regardless of case', () => {
    const c = doc({
      suburbs: [suburb()],
      sections: areaCopy('katy', 'cinco ranch, FIRETHORNE and Seven Meadows are all nearby.'),
    })
    expect(checkQuality(c)).toEqual([])
  })

  it('requires only as many as exist when an area has fewer than three', () => {
    /*
     * An area with two researched subdivisions can still clear the uniqueness
     * gate (scoreSuburbs only rejects ZERO outright), so demanding three of
     * two would fail a page that did everything it honestly could.
     */
    const thin = suburb({ slug: 'thin', name: 'Thin', subdivisions: ['Only One', 'And Two'] })
    const c = doc({ suburbs: [thin], sections: areaCopy('thin', 'Only One and And Two.') })
    expect(checkQuality(c)).toEqual([])
  })

  it('says nothing about an area with no subdivisions at all', () => {
    // The uniqueness gate drops these before generation, and a hand-added
    // suburbs-editor row legitimately has none. There is nothing to demand.
    const bare = suburb({ slug: 'bare', name: 'Bare', subdivisions: [] })
    expect(checkQuality(doc({ suburbs: [bare], sections: {} }))).toEqual([])
  })

  it('reports a missing area page as uncovered rather than crashing on it', () => {
    const c = doc({ suburbs: [suburb()], sections: {} })
    const findings = checkQuality(c)
    expect(findings).toHaveLength(1)
    expect(findings[0].detail).toMatch(/0 of 4/)
  })
})

describe('ops facts used', () => {
  const withCrew: MarketOps = { crewLead: 'Maria', homesCleaned: 340 }

  it('passes when every enforced fact appears somewhere in the copy', () => {
    const c = doc({
      ops: withCrew,
      sections: { 'services.serviceIntro': 'Maria leads our crew. We have cleaned 340 homes here.' },
    })
    expect(checkQuality(c)).toEqual([])
  })

  it('FAILS when a supplied crew lead is never mentioned', () => {
    // Abdi's rule, and the whole point of the ops block: a page that received
    // a real fact and ignored it is a failed page.
    const c = doc({ ops: withCrew, sections: { 'services.serviceIntro': 'We cleaned 340 homes.' } })
    const findings = checkQuality(c)
    expect(findings).toHaveLength(1)
    expect(findings[0].rule).toBe('ops-unused')
    expect(findings[0].blocking).toBe(true)
    expect(findings[0].detail).toContain('Maria')
  })

  it('FAILS when a supplied homes-cleaned count is never mentioned', () => {
    const c = doc({ ops: withCrew, sections: { 'services.serviceIntro': 'Maria leads our crew.' } })
    expect(checkQuality(c).map((f) => f.detail)).toEqual([expect.stringContaining('340')])
  })

  it('accepts the count written with a thousands separator', () => {
    // opsBlock hands the model toLocaleString(), so "1,200" is what the page
    // is asked to print — checking only the raw digits would fail every page
    // that did exactly as it was told.
    const c = doc({
      ops: { homesCleaned: 1200 },
      sections: { 'services.serviceIntro': 'We have cleaned 1,200 homes in Houston.' },
    })
    expect(checkQuality(c)).toEqual([])
  })

  it('looks across the WHOLE document, not just the front page', () => {
    /*
     * content-strategy.md's sketch reads only slots starting with
     * "services.". A crew lead named on an area page or a service page would
     * report as unused, and a validator that cries wolf is one an operator
     * learns to click past.
     */
    const c = doc({
      ops: { crewLead: 'Maria' },
      sections: { 'suburb.katy.intro': 'Maria and her crew work Katy most weeks.' },
    })
    expect(checkQuality(c)).toEqual([])
  })

  it('reads array slots too', () => {
    const c = doc({
      ops: { crewLead: 'Maria' },
      sections: { 'services.heroParagraphs': ['One.', 'Maria leads the crew here.'] },
    })
    expect(checkQuality(c)).toEqual([])
  })

  it('enforces nothing when the market has no ops facts', () => {
    expect(checkQuality(doc({ sections: { 'deep.whatIs': 'Anything.' } }))).toEqual([])
  })

  it('does NOT enforce servingSince, crewSize or reviews', () => {
    /*
     * Deliberate, and the reason is false positives. servingSince is supplied
     * as "2024-03" and the prompt asks for it "plainly", so a correct page
     * says "March 2024" and a literal check fails it. crewSize can honestly
     * be written as a word. Reviews are quoted "at most two", so zero is
     * within the instruction. Enforcing any of the three would fail pages
     * that did nothing wrong.
     */
    const c = doc({
      ops: { servingSince: '2024-03', crewSize: 4, reviews: [{ quote: 'Spotless.', firstName: 'Dan', area: 'Katy' }] },
      sections: { 'deep.whatIs': 'Nothing here mentions any of that.' },
    })
    expect(checkQuality(c)).toEqual([])
  })
})

describe('banned phrases', () => {
  it('flags a banned phrase and names both the slot and the phrase', () => {
    const c = doc({ sections: { 'deep.whatIs': 'Our home is nestled in the heart of Houston.' } })
    const findings = checkQuality(c)
    expect(findings).toHaveLength(1)
    expect(findings[0].rule).toBe('banned-phrase')
    expect(findings[0].slot).toBe('deep.whatIs')
    expect(findings[0].detail).toContain('nestled in the heart of')
  })

  it('warns rather than blocks', () => {
    // A banned phrase is a regeneration prompt, not a reason to refuse a
    // whole city — unlike a missing entity or an ignored operator fact.
    const c = doc({ sections: { 'deep.whatIs': 'Look no further.' } })
    expect(checkQuality(c)[0].blocking).toBe(false)
  })

  it('is case-insensitive', () => {
    const c = doc({ sections: { 'deep.whatIs': 'LOOK NO FURTHER.' } })
    expect(checkQuality(c)).toHaveLength(1)
  })

  it('checks array slots element by element', () => {
    const c = doc({ sections: { 'services.heroParagraphs': ['Fine.', "We've got you covered."] } })
    expect(checkQuality(c)).toHaveLength(1)
  })

  it('carries the same list the prompt forbids', () => {
    // One list, one definition. If SYSTEM_BASE and this check ever disagree,
    // the prompt forbids something nothing verifies, or this fails copy the
    // model was never told to avoid.
    expect(BANNED_PHRASES).toContain('nestled in the heart of')
    expect(BANNED_PHRASES).toContain('assertively declare')
    expect(BANNED_PHRASES.length).toBeGreaterThan(10)
  })
})

describe('findings as a whole', () => {
  it('returns blocking findings before warnings, so the first line is the one that stops publish', () => {
    const c = doc({
      suburbs: [suburb()],
      sections: { ...areaCopy('katy', 'Look no further — we clean here.') },
    })
    const findings = checkQuality(c)
    expect(findings.length).toBeGreaterThan(1)
    expect(findings[0].blocking).toBe(true)
    expect(findings[findings.length - 1].blocking).toBe(false)
  })

  it('is silent on a document that did everything right', () => {
    const c = doc({
      suburbs: [suburb()],
      ops: { crewLead: 'Maria', homesCleaned: 340 },
      sections: {
        ...areaCopy('katy', 'Cinco Ranch, Firethorne and Seven Meadows all sit west of us.'),
        'services.serviceIntro': 'Maria leads the crew that has cleaned 340 homes here.',
      },
    })
    expect(checkQuality(c)).toEqual([])
  })
})
