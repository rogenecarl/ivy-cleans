import { describe, expect, it } from 'vitest'
import { longestSharedRun, normalize, shingleSimilarity } from '../src/content/similarity'
import { checkCity, flattenSections, type SectionMap } from '../src/content/similarity'

describe('normalize', () => {
  it('folds case, curly quotes and runs of whitespace', () => {
    expect(normalize('The  “Best”   Clean’s')).toBe('the "best" clean\'s')
  })
})

describe('longestSharedRun', () => {
  it('finds the longest verbatim run shared by two strings', () => {
    const a = 'we offer home cleaning service in most or all of the following zips'
    const b = 'today we offer home cleaning service in most or all of the following areas'
    expect(longestSharedRun(a, b)).toContain('home cleaning service in most or all of the following')
  })

  it('returns an empty string when nothing meaningful is shared', () => {
    expect(longestSharedRun('alpha bravo', 'zulu yankee').length).toBeLessThan(5)
  })
})

describe('shingleSimilarity', () => {
  it('scores identical text 1', () => {
    const t = 'gulf humidity keeps bathrooms damp enough for mildew to settle in'
    expect(shingleSimilarity(t, t)).toBe(1)
  })

  it('scores unrelated text near 0', () => {
    const a = 'gulf humidity keeps bathrooms damp enough for mildew to settle in'
    const b = 'road salt and winter sand get tracked across entry tile from november'
    expect(shingleSimilarity(a, b)).toBeLessThan(0.1)
  })
})

describe('flattenSections', () => {
  it('expands arrays to indexed slot ids', () => {
    const flat = flattenSections({ 'deep.whatIs': 'x', 'services.serviceIntro': ['a', 'b'] })
    expect(flat).toContainEqual(['deep.whatIs', 'x'])
    expect(flat).toContainEqual(['services.serviceIntro[0]', 'a'])
    expect(flat).toContainEqual(['services.serviceIntro[1]', 'b'])
  })

  it('exempts hero paragraphs 4 and 5, which are fixed brand lines', () => {
    const hero = ['p1', 'p2', 'p3', 'cta four', 'cta five']
    const slots = flattenSections({ 'services.heroParagraphs': hero }).map(([s]) => s)
    expect(slots).toContain('services.heroParagraphs[0]')
    expect(slots).not.toContain('services.heroParagraphs[3]')
    expect(slots).not.toContain('services.heroParagraphs[4]')
  })
})

describe('checkCity', () => {
  const shared =
    'we offer home cleaning service in most or all of the following residential zip codes across the metro area'

  it('reports a verbatim run shared with another published city', () => {
    const findings = checkCity(
      'Houston',
      { 'deep.whatIs': shared },
      [{ city: 'Minneapolis', sections: { 'deep.whatIs': shared } }],
    )
    expect(findings.some((f) => f.kind === 'verbatim' && f.otherCity === 'Minneapolis')).toBe(true)
  })

  it('passes genuinely different copy', () => {
    const findings = checkCity(
      'Houston',
      { 'deep.whatIs': 'gulf humidity settles into grout and shower glass faster than owners expect' },
      [{ city: 'Minneapolis', sections: { 'deep.whatIs': 'road salt and winter sand arrive on every boot from november' } }],
    )
    expect(findings).toEqual([])
  })

  it('never compares a city against itself', () => {
    const sections: SectionMap = { 'deep.whatIs': shared }
    expect(checkCity('Houston', sections, [{ city: 'Houston', sections }])).toEqual([])
  })

  it('flags two sibling area pages that read the same', () => {
    const text = 'the homes here sit in master planned communities with tile floors throughout and grout that shows every footprint'
    const findings = checkCity(
      'Houston',
      { 'suburb.katy.homes': text, 'suburb.sugar-land.homes': text },
      [],
    )
    expect(findings.some((f) => f.detail.includes('sibling'))).toBe(true)
  })

  it('does not compare an intro against a homes paragraph', () => {
    const text = 'the homes here sit in master planned communities with tile floors throughout and grout that shows every footprint'
    const findings = checkCity(
      'Houston',
      { 'suburb.katy.intro': text, 'suburb.sugar-land.homes': text },
      [],
    )
    expect(findings.filter((f) => f.detail.includes('sibling'))).toEqual([])
  })
})
