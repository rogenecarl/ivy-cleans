/*
 * The internal link graph, asserted per city — scripts/check-links.mjs runs this file. Every content/*.json city
 * is checked, drafts included: a draft renders at its preview and must hold the same shape.
 */
import { readdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { inbound, linkGraph } from '../src/data/link-graph'
import { getCity } from '../src/content/store'
import { loadCityFixture } from './fixtures/cities/load'
import type { CityContent } from '../src/content/types'

const keys = (await readdir('content', { withFileTypes: true }))
  .filter((e) => e.isFile() && e.name.endsWith('.json') && !e.name.startsWith('_'))
  .map((e) => e.name.slice(0, -5))
const cities: CityContent[] = [...(await Promise.all(keys.map((k) => getCity(k)))), await loadCityFixture('miami'), await loadCityFixture('testville')]

const NO_CRUMB = new Set(['/', '/home', '/book-now'])

describe.each(cities.map((c) => [c.city, c] as const))('%s', (_name, c) => {
  const graph = linkGraph(c)
  const inboundOf = inbound(graph)
  const areas = c.hasSuburbPages ? c.research.suburbs.map((s) => `/${s.slug}`) : []
  const hasNeighbours = c.research.suburbs.some((s) => (s.neighbors ?? []).length > 0)

  it('no link leaves the tenant or points at a page it does not serve', () => {
    expect(graph.problems).toEqual([])
  })

  it('every inner page has a breadcrumb', () => {
    for (const page of graph.pages) {
      if (NO_CRUMB.has(page)) continue
      expect(graph.crumbs.get(page), page).toBeGreaterThanOrEqual(2)
    }
  })

  it('no page has zero inbound links', () => {
    for (const page of graph.pages) expect(inboundOf.get(page)!.size, page).toBeGreaterThan(0)
  })

  it('every area page is linked from a service page, and from another area when it has neighbours', () => {
    for (const suburb of c.hasSuburbPages ? c.research.suburbs : []) {
      const page = `/${suburb.slug}`
      const from = [...inboundOf.get(page)!]
      expect(from.some((p) => p.startsWith('/services/')), `${page} <- services`).toBe(true)
      if ((suburb.neighbors ?? []).length > 0) expect(from.some((p) => areas.includes(p)), `${page} <- areas`).toBe(true)
    }
  })

  it('summary', () => {
    const areaInbound = areas.map((p) => inboundOf.get(p)!.size)
    const isolated = c.hasSuburbPages ? c.research.suburbs.filter((s) => !(s.neighbors ?? []).length).map((s) => s.name) : []
    if (hasNeighbours && isolated.length) process.stdout.write(`  ${c.city}: no neighbours researched for ${isolated.join(', ')}\n`)
    process.stdout.write(
      `  ${c.city}: ${graph.pages.length} pages, ${[...graph.edges.values()].reduce((n, s) => n + s.size, 0)} links` +
        (areas.length ? `, area pages have ${Math.min(...areaInbound)}–${Math.max(...areaInbound)} inbound` : '') +
        '\n',
    )
  })
})
