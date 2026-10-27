// ResearchSchema and the uniqueness gate — pure functions, no disk.
import { describe, expect, it } from 'vitest'
import { applyUniquenessGate, scoreSuburb, scoreSuburbs } from '@/server/pipeline/stages'
import { ConditionSchema, ResearchSchema, type ResearchOutput, type Suburb } from '@/server/pipeline/schemas'

describe('ResearchSchema', () => {
  it('accepts an area carrying subdivisions, housing character and conditions', () => {
    const parsed = ResearchSchema.parse({
      suburbs: [
        {
          name: 'Katy',
          slug: 'katy',
          subdivisions: ['Cinco Ranch', 'Firethorne', 'Cross Creek Ranch'],
          housingCharacter: 'Master-planned, built 2000 onward, 2,400–3,400 sq ft, tile and LVP.',
          neighbors: [],
          conditions: [{ condition: 'Ongoing construction nearby', implication: 'Fine grit on sills and blinds', copySafe: true }],
        },
      ],
      conditions: [{ condition: 'Gulf humidity', implication: 'Grout and shower glass discolour faster', copySafe: true }],
      zips: ['77002'],
      keywords: ['house cleaning katy tx'],
    })
    expect(parsed.suburbs[0].subdivisions).toHaveLength(3)
  })

  it('rejects landmarks, which no longer exist', () => {
    expect(() =>
      ResearchSchema.parse({
        suburbs: [],
        conditions: [],
        zips: [],
        keywords: [],
        landmarks: ['Kemah Boardwalk'],
      }),
    ).toThrow()
  })

  it('requires copySafe on every condition', () => {
    expect(() => ConditionSchema.parse({ condition: 'a', implication: 'b' })).toThrow()
  })
})

describe('the uniqueness gate', () => {
  /** 4 subdivisions + 1 copySafe condition + housing character (2) = 7. */
  function katy(): Suburb {
    return {
      name: 'Katy',
      slug: 'katy',
      subdivisions: ['Cinco Ranch', 'Firethorne', 'Cross Creek Ranch', 'Grand Lakes'],
      housingCharacter: 'Master-planned, 2000 onward, tile and LVP.',
      neighbors: [],
      conditions: [
        { condition: 'Construction nearby', implication: 'Grit on sills', copySafe: true },
        { condition: 'Barker Reservoir flood pool', implication: 'n/a', copySafe: false },
      ],
    }
  }

  /** Nothing researched at all — the floor case. */
  function thin(): Suburb {
    return { name: 'Fulshear', slug: 'fulshear', subdivisions: [], housingCharacter: '', neighbors: [], conditions: [] }
  }

  function fixtureResearchWith(suburbs: Suburb[]): ResearchOutput {
    return { suburbs, conditions: [], zips: [], keywords: [] }
  }

  it('scores subdivisions plus copySafe conditions plus housing character — a copySafe:false condition does not count', () => {
    expect(scoreSuburb(katy())).toBe(7) // 4 + 1 + 2, not 4 + 2 + 2
  })

  it('scores an unresearched area 0', () => {
    expect(scoreSuburb(thin())).toBe(0)
  })

  it('scores whitespace-only housing character as absent, not present', () => {
    const whitespaceHousing: Suburb = { ...thin(), housingCharacter: '   ' }
    expect(scoreSuburb(whitespaceHousing)).toBe(0)
  })

  // These three pin the comparison operators exactly. Without them, mutating
  // `>= BUILD_THRESHOLD` to `> BUILD_THRESHOLD`, or shifting REVIEW_THRESHOLD
  // by one, would pass every other test in this file — an off-by-one here
  // silently changes which pages exist.
  it('scores exactly 8 as build, not review', () => {
    const buildFloor: Suburb = {
      name: 'Build Floor',
      slug: 'build-floor',
      subdivisions: ['A', 'B', 'C', 'D'],
      housingCharacter: 'Present.',
      neighbors: [],
      conditions: [
        { condition: 'a', implication: 'a', copySafe: true },
        { condition: 'b', implication: 'b', copySafe: true },
      ],
    }
    expect(scoreSuburb(buildFloor)).toBe(8) // 4 + 2 + 2
    expect(scoreSuburbs(fixtureResearchWith([buildFloor]))[0].verdict).toBe('build')
  })

  it('scores exactly 4 as review, not skip', () => {
    const reviewFloor: Suburb = {
      name: 'Review Floor',
      slug: 'review-floor',
      subdivisions: ['A', 'B', 'C', 'D'],
      housingCharacter: '',
      neighbors: [],
      conditions: [],
    }
    expect(scoreSuburb(reviewFloor)).toBe(4) // 4 + 0 + 0
    expect(scoreSuburbs(fixtureResearchWith([reviewFloor]))[0].verdict).toBe('review')
  })

  it('scores exactly 3 as skip, not review', () => {
    const skipCeiling: Suburb = {
      name: 'Skip Ceiling',
      slug: 'skip-ceiling',
      subdivisions: ['A', 'B', 'C'],
      housingCharacter: '',
      neighbors: [],
      conditions: [],
    }
    expect(scoreSuburb(skipCeiling)).toBe(3) // 3 + 0 + 0
    expect(scoreSuburbs(fixtureResearchWith([skipCeiling]))[0].verdict).toBe('skip')
  })

  it('drops skip-verdict areas from research.suburbs and keeps the rest', () => {
    const { research, scored } = applyUniquenessGate(fixtureResearchWith([katy(), thin()]))
    expect(research.suburbs.map((s) => s.slug)).toEqual(['katy'])
    expect(scored.find((s) => s.suburb.slug === 'katy')!.verdict).toBe('review')
  })

  it('still returns the skipped area in the scored list, with verdict skip', () => {
    const { scored } = applyUniquenessGate(fixtureResearchWith([katy(), thin()]))
    const dropped = scored.find((s) => s.suburb.slug === 'fulshear')
    expect(dropped).toBeDefined()
    expect(dropped!.verdict).toBe('skip')
  })

  it('records a non-empty reason for every verdict', () => {
    const scored = scoreSuburbs(fixtureResearchWith([katy(), thin()]))
    expect(scored).toHaveLength(2)
    for (const s of scored) expect(s.reason.trim().length).toBeGreaterThan(0)
  })

  // Fix round 1: buildSuburbPrompt's homes paragraph must name at least
  // three real subdivisions, so zero subdivisions makes an area
  // structurally unbuildable no matter how it otherwise scores. This one
  // scores 6 (0 subdivisions + 2 housing + 4 safe conditions) — squarely
  // 'review' by the threshold ladder alone — and must still be forced to
  // 'skip'.
  it('forces verdict skip for an area with no subdivisions even when its score would be review', () => {
    const noSubdivisionsButOtherwiseRich: Suburb = {
      name: 'No Subdivisions',
      slug: 'no-subdivisions',
      subdivisions: [],
      housingCharacter: 'Present.',
      neighbors: [],
      conditions: [
        { condition: 'a', implication: 'a', copySafe: true },
        { condition: 'b', implication: 'b', copySafe: true },
        { condition: 'c', implication: 'c', copySafe: true },
        { condition: 'd', implication: 'd', copySafe: true },
      ],
    }
    expect(scoreSuburb(noSubdivisionsButOtherwiseRich)).toBe(6)
    const [scored] = scoreSuburbs(fixtureResearchWith([noSubdivisionsButOtherwiseRich]))
    expect(scored.verdict).toBe('skip')
    expect(scored.reason).toMatch(/subdivisions/i)
  })

  it('applyUniquenessGate removes a no-subdivisions area from research.suburbs', () => {
    const noSubdivisions: Suburb = {
      name: 'No Subdivisions',
      slug: 'no-subdivisions',
      subdivisions: [],
      housingCharacter: 'Present.',
      neighbors: [],
      conditions: [
        { condition: 'a', implication: 'a', copySafe: true },
        { condition: 'b', implication: 'b', copySafe: true },
        { condition: 'c', implication: 'c', copySafe: true },
        { condition: 'd', implication: 'd', copySafe: true },
      ],
    }
    const { research } = applyUniquenessGate(fixtureResearchWith([katy(), noSubdivisions]))
    expect(research.suburbs.map((s) => s.slug)).toEqual(['katy'])
  })
})
