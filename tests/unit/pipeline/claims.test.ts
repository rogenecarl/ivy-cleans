import { describe, expect, it } from 'vitest'
import { agreement, blockedNames, researchFromClaims, toResearchAndClaims, type ResearchClaim } from '@/server/pipeline/claims'
import type { ResearchStructured } from '@/server/pipeline/schemas'

const S = new Set(['S1', 'S2'])

function structured(): ResearchStructured {
  return {
    suburbs: [
      {
        name: 'Edina',
        slug: 'edina',
        sources: ['S1'],
        subdivisions: [
          { name: 'Morningside', sources: ['S1'] },
          { name: 'Country Club', sources: ['S2'] },
          { name: 'Rumoured Estates', sources: [] },
          { name: 'Ghost Park', sources: ['S9'] },
          { name: 'Indian Hills', sources: ['S1'] },
          { name: 'Parkwood Knolls', sources: ['S2'] },
        ],
        housing: { text: '1920s Tudors and mid-century ramblers.', sources: ['S1'] },
        neighbors: ['Hopkins'],
        conditions: [
          { condition: 'Hard water', implication: 'Scale on fixtures.', copySafe: true, sources: ['S2'] },
          { condition: 'Median income', implication: 'Market judgement.', copySafe: false, sources: ['S2'] },
        ],
      },
      {
        name: 'Hopkins',
        slug: 'hopkins',
        sources: ['S2'],
        subdivisions: [
          { name: 'Interlachen Park', sources: ['S2'] },
          { name: 'Westbrooke', sources: ['S2'] },
          { name: 'Shady Oak', sources: ['S2'] },
          { name: 'Belgrove', sources: ['S2'] },
        ],
        housing: { text: 'Postwar ramblers.', sources: ['S2'] },
        neighbors: ['Edina'],
        conditions: [],
      },
      {
        name: 'Unsourced Town',
        slug: 'unsourced-town',
        sources: [],
        subdivisions: [{ name: 'Lost Acres', sources: ['S1'] }],
        housing: { text: 'Anything.', sources: ['S1'] },
        neighbors: [],
        conditions: [],
      },
    ],
    conditions: [{ condition: 'Cold winters', implication: 'Salt on floors.', copySafe: true, sources: ['S1'] }],
    zips: [
      { zip: '55424', sources: ['S1'] },
      { zip: '55999', sources: [] },
    ],
    keywords: [],
  }
}

function set(claims: ResearchClaim[], text: string, status: ResearchClaim['status']): ResearchClaim[] {
  return claims.map((c) => (c.text === text ? { ...c, status } : c))
}

describe('toResearchAndClaims', () => {
  const { research, claims } = toResearchAndClaims(structured(), S)
  const edina = research.suburbs.find((s) => s.slug === 'edina')!

  it('keeps sourced items and drops items with no valid source', () => {
    expect(edina.subdivisions).toEqual(['Morningside', 'Country Club', 'Indian Hills', 'Parkwood Knolls'])
    expect(claims.map((c) => c.text)).not.toContain('Rumoured Estates')
    expect(claims.map((c) => c.text)).not.toContain('Ghost Park')
    expect(research.zips).toEqual(['55424'])
  })

  it('records each kept item as a pending claim with its sources', () => {
    expect(claims).toContainEqual({
      id: 'edina:subdivision:morningside',
      area: 'edina',
      kind: 'subdivision',
      text: 'Morningside',
      sources: ['S1'],
      status: 'pending',
    })
    expect(claims.find((c) => c.kind === 'area' && c.area === 'edina')?.id).toBe('edina:area:edina')
    expect(claims.find((c) => c.kind === 'zip')).toMatchObject({ id: '_city:zip:55424', area: null })
  })

  it('marks a condition that is never printed as unchecked', () => {
    expect(claims.find((c) => c.text === 'Median income')?.status).toBe('unchecked')
    expect(claims.find((c) => c.text === 'Hard water')?.status).toBe('pending')
  })

  it('drops an area that has no source of its own, with everything in it', () => {
    expect(research.suburbs.map((s) => s.slug)).toEqual(['edina', 'hopkins'])
    expect(claims.some((c) => c.area === 'unsourced-town' || c.text === 'Lost Acres')).toBe(false)
  })
})

describe('researchFromClaims', () => {
  const { research, claims } = toResearchAndClaims(structured(), S)

  it('removes only the subdivision that is not accepted', () => {
    const out = researchFromClaims(research, set(claims, 'Country Club', 'unconfirmed'))
    expect(out.suburbs.find((s) => s.slug === 'edina')?.subdivisions).toEqual(['Morningside', 'Indian Hills', 'Parkwood Knolls'])
  })

  it('keeps a subdivision the operator kept', () => {
    const out = researchFromClaims(research, set(claims, 'Country Club', 'kept'))
    expect(out.suburbs.find((s) => s.slug === 'edina')?.subdivisions).toContain('Country Club')
  })

  it('removes a dropped area and everything in it', () => {
    const out = researchFromClaims(research, set(claims, 'Hopkins', 'dropped'))
    expect(out.suburbs.map((s) => s.slug)).toEqual(['edina'])
    expect(out.suburbs[0].neighbors).toEqual([])
  })

  it('re-runs the uniqueness gate: an area left with too little gets no page', () => {
    let c = set(claims, 'Interlachen Park', 'wrong')
    c = set(c, 'Westbrooke', 'wrong')
    c = set(c, 'Shady Oak', 'wrong')
    c = set(c, 'Postwar ramblers.', 'wrong')
    expect(researchFromClaims(research, c).suburbs.map((s) => s.slug)).toEqual(['edina'])
  })

  it('clears the housing text when its claim is wrong', () => {
    const out = researchFromClaims(research, set(claims, '1920s Tudors and mid-century ramblers.', 'wrong'))
    expect(out.suburbs.find((s) => s.slug === 'edina')?.housingCharacter).toBe('')
  })

  it('links neighbours by slug among the areas that remain', () => {
    const out = researchFromClaims(research, claims)
    expect(out.suburbs.find((s) => s.slug === 'edina')?.neighbors).toEqual(['hopkins'])
  })
})

describe('blockedNames', () => {
  const claims: ResearchClaim[] = [
    { id: 'a:subdivision:heights-park-estates', area: 'a', kind: 'subdivision', text: 'Heights Park Estates', sources: ['S1'], status: 'dropped' },
    { id: 'a:subdivision:norhill', area: 'a', kind: 'subdivision', text: 'Norhill', sources: ['S1'], status: 'confirmed' },
    { id: 'a:subdivision:oak', area: 'a', kind: 'subdivision', text: 'Oak', sources: ['S1'], status: 'unconfirmed' },
    { id: 'a:condition:x', area: 'a', kind: 'condition', text: 'Hard water', sources: ['S1'], status: 'wrong' },
  ]

  it('finds an unconfirmed, wrong or dropped place name in the copy', () => {
    expect(blockedNames('Homes around heights park estates date to 1920.', claims)).toEqual(['Heights Park Estates'])
  })

  it('does not refuse a dropped name that is only part of a confirmed one', () => {
    const withPark: ResearchClaim[] = [
      { id: 'a:subdivision:kenwood', area: 'a', kind: 'subdivision', text: 'Kenwood', sources: ['S1'], status: 'dropped' },
      { id: 'a:subdivision:kenwood-park', area: 'a', kind: 'subdivision', text: 'Kenwood Park', sources: ['S1'], status: 'confirmed' },
    ]
    expect(blockedNames('Homes in Kenwood Park have plaster walls.', withPark)).toEqual([])
    expect(blockedNames('Kenwood Park and Kenwood both have plaster walls.', withPark)).toEqual(['Kenwood'])
  })

  it('ignores a confirmed name, a word inside another word, and conditions', () => {
    expect(blockedNames('Norhill bungalows near Oakwood face hard water.', claims)).toEqual([])
  })
})

describe('agreement with a known list', () => {
  it('counts matched names, and lists the extra and the missing, ignoring case', () => {
    const research = {
      suburbs: [
        { name: 'Edina', slug: 'edina', subdivisions: ['Morningside', 'Made Up Park'], housingCharacter: '', neighbors: [], conditions: [] },
        { name: 'Nowhere', slug: 'nowhere', subdivisions: [], housingCharacter: '', neighbors: [], conditions: [] },
      ],
      conditions: [],
      zips: [],
      keywords: [],
    }
    const result = agreement(research, { EDINA: ['morningside', 'Country Club'], Hopkins: [] })
    expect(result).toEqual({
      matched: 2, // Edina, Morningside
      extra: ['Nowhere', 'Edina › Made Up Park'],
      missing: ['Hopkins', 'Edina › Country Club'],
    })
  })
})
