import { describe, expect, it } from 'vitest'
import { MAX_NEIGHBORS, buildAreasResearchPrompt, buildResearchStructuringPrompt, linkNeighbors } from '../src/pipeline/stages'
import { deriveFacts } from '../src/pipeline/facts'
import { suburbData } from '../src/data/suburb'
import { loadCityFixture } from './fixtures/cities/load'

const miami = await loadCityFixture('miami')
const facts = deriveFacts({ city: 'Orlando', state: 'FL', phoneDigits: '4075550142' })

const area = (name: string, neighbors: string[] = []) => ({
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  subdivisions: ['A'],
  housingCharacter: '',
  conditions: [],
  neighbors,
})
const research = (suburbs: ReturnType<typeof area>[]) => ({ suburbs, conditions: [], zips: [], keywords: [] })

describe('linkNeighbors', () => {
  it('turns names into slugs and makes the relation symmetric', () => {
    const r = linkNeighbors(research([area('Lake Mary', ['Sanford']), area('Sanford'), area('Longwood', ['lake mary'])]))
    const by = Object.fromEntries(r.suburbs.map((s) => [s.slug, s.neighbors]))
    expect(by['lake-mary']).toEqual(['sanford', 'longwood'])
    expect(by['sanford']).toEqual(['lake-mary'])
    expect(by['longwood']).toEqual(['lake-mary'])
  })

  it('drops unknown areas, self-references and duplicates', () => {
    const r = linkNeighbors(research([area('Lake Mary', ['Lake Mary', 'Sanford', 'Sanford', 'Nowhere']), area('Sanford')]))
    expect(r.suburbs[0].neighbors).toEqual(['sanford'])
  })

  it('caps at MAX_NEIGHBORS, in research order', () => {
    const names = ['A', 'B', 'C', 'D', 'E', 'F']
    const r = linkNeighbors(research([area('Hub', names), ...names.map((n) => area(n))]))
    expect(r.suburbs[0].neighbors).toEqual(['a', 'b', 'c', 'd'])
    expect(r.suburbs[0].neighbors).toHaveLength(MAX_NEIGHBORS)
  })

  it('leaves everything else on the suburb untouched', () => {
    const r = linkNeighbors(research([{ ...area('Lake Mary', ['Sanford']), subdivisions: ['Heathrow'] }, area('Sanford')]))
    expect(r.suburbs[0].subdivisions).toEqual(['Heathrow'])
  })
})

describe('the prompts ask for neighbours', () => {
  it('research brief part (a) asks which areas border which', () => {
    expect(buildAreasResearchPrompt(facts)).toContain('it borders or sits next to')
  })
  it('the structuring pass has a neighbors field limited to the suburbs list', () => {
    const prompt = buildResearchStructuringPrompt('findings', facts, [])
    expect(prompt).toContain('neighbors: the two to four OTHER areas from this same suburbs list')
  })
})

describe('suburbData.nearby', () => {
  const [a, b, c] = miami.research.suburbs
  const withNeighbors = {
    ...miami,
    hasSuburbPages: true,
    research: {
      ...miami.research,
      suburbs: miami.research.suburbs.map((s) =>
        s.slug === a.slug ? { ...s, neighbors: [b.slug, c.slug, 'gone-area'] } : s,
      ),
    },
  }

  it('links the neighbours that still exist, through cityHref', () => {
    const { nearby } = suburbData(withNeighbors, { name: a.name, slug: a.slug })
    expect(nearby.heading).toBe('Nearby areas we also serve')
    expect(nearby.links).toEqual([
      { label: b.name, href: `/miami/${b.slug}` },
      { label: c.name, href: `/miami/${c.slug}` },
    ])
  })

  it('is empty when the city has no area pages, or the area has no neighbours', () => {
    expect(suburbData({ ...withNeighbors, hasSuburbPages: false }, { name: a.name, slug: a.slug }).nearby.links).toEqual([])
    expect(suburbData(withNeighbors, { name: b.name, slug: b.slug }).nearby.links).toEqual([])
  })
})
