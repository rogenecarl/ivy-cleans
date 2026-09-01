import { describe, expect, it } from 'vitest'
import { longestSharedRun, normalize, shingleSimilarity } from '../src/content/similarity'

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
