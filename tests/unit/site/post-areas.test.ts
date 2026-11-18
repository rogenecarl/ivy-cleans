import { describe, expect, it } from 'vitest'
import { getCity } from '@/server/content/store'
import { postAreaLinks } from '@/site/data/blog'
import { areasData } from '@/site/data/areas'

const minneapolis = await getCity('minneapolis')
const all = areasData(minneapolis).areas

describe('postAreaLinks', () => {
  it('gives three of the city’s area pages, same three for the same post', () => {
    const a = postAreaLinks(minneapolis, 'minnesota-spring-cleaning-checklist')
    expect(a).toHaveLength(3)
    for (const area of a) expect(all).toContainEqual(area)
    expect(postAreaLinks(minneapolis, 'minnesota-spring-cleaning-checklist')).toEqual(a)
  })

  it('spreads different posts over different areas', () => {
    const firsts = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((s) => postAreaLinks(minneapolis, `post-${s}`)[0].href))
    expect(firsts.size).toBeGreaterThan(3)
  })

  it('is empty for a city with no areas', () => {
    expect(postAreaLinks({ ...minneapolis, research: { ...minneapolis.research, suburbs: [] } }, 'x')).toEqual([])
  })
})
