/*
 * Meta descriptions cut from generated copy — Abdi's Orlando review, item 9.
 */
import { describe, expect, it } from 'vitest'
import { META_DESCRIPTION_MAX, metaDescription } from '../src/data/meta'
import { homeData } from '../src/data/home'
import { getCity } from '../src/content/store'
import { loadCityFixture } from './fixtures/cities/load'

const minneapolis = await getCity('minneapolis')
const miami = await loadCityFixture('miami')

describe('metaDescription()', () => {
  it('returns short text whole', () => {
    expect(metaDescription('Terrazzo floors and screened lanais. We clean both.')).toBe(
      'Terrazzo floors and screened lanais. We clean both.',
    )
  })

  it('keeps whole sentences while they fit, and drops the one that does not', () => {
    const a = 'Homes in Lake Mary sit on half-acre lots under live oaks that shed all spring.'
    const b = 'Most have screened lanais that collect pollen and lovebugs in equal measure.'
    const c = 'Heathrow needs gate authorization before a crew can get in, and we arrange it the day before.'
    expect(metaDescription(`${a} ${b} ${c}`)).toBe(`${a} ${b}`)
    expect(`${a} ${b}`.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX)
  })

  it('cuts an over-long first sentence at a word boundary with an ellipsis', () => {
    const long =
      'Windermere homes on the Butler Chain carry marble entries, dock grit tracked through the lanai, and blind mosquitoes that die in drifts against every screen from May onward.'
    const out = metaDescription(long)
    expect(out.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toMatch(/\S+…$/.source.replace('\\S+', '')) // never ends mid-word
    expect(long.startsWith(out.slice(0, -1))).toBe(true)
    expect(long[out.length - 1]).toBe(' ')
  })

  it('does not split on the abbreviations in place names', () => {
    const text = 'St. Louis Park homes are mostly 1950s ramblers. Many have finished basements.'
    expect(metaDescription(text, 60)).toBe('St. Louis Park homes are mostly 1950s ramblers.')
  })

  it('collapses whitespace', () => {
    expect(metaDescription('One  sentence.\n\nAnother.')).toBe('One sentence. Another.')
  })
})

describe('the pages that use it', () => {
  it('/home describes itself with the second hero paragraph, within the limit', () => {
    for (const c of [minneapolis, miami]) {
      const { homeMeta } = homeData(c)
      const hero = c.sections['services.heroParagraphs'] as string[]
      expect(homeMeta.description.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX)
      expect(hero[1].startsWith(homeMeta.description.replace(/…$/, ''))).toBe(true)
      // and not the template line it replaced
      expect(homeMeta.description).not.toContain('great choice for all of your home cleaning needs')
    }
  })
})
