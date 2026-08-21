/*
 * The new-city rendering behaviours, exercised against BOTH shipped city
 * documents: Minneapolis (live, 24 suburbs, real suburb pages) and Testville
 * (the draft fixture: 3 suburbs, no maps).
 *
 * Plan 5 Task 2 flipped Testville's own `hasSuburbPages` to true (every draft
 * city gets real suburb pages now — see finalizeDraft in src/content/drafts.ts),
 * so the "no-suburb-pages, names render unlinked" scenario below passes
 * `hasSuburbPages={false}` as a literal rather than reading it off the
 * fixture — it tests the FALSE branch of ServiceArea/Locations using
 * Testville's area/copy data, independent of what Testville's real flag is.
 * A second pair of tests exercises Testville's actual (true) flag: a
 * non-Minneapolis draft city with real, `/testville/`-prefixed suburb links.
 *
 * These are server components with no client-only hooks, so
 * renderToStaticMarkup in plain node is enough — no jsdom, no Next runtime.
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ServiceArea from '@/components/ServiceArea'
import Locations from '@/components/home/Locations'
import { areasData } from '@/data/areas'
import { homeData } from '@/data/home'
import { siteData } from '@/data/site'
import { cityBits, getCity } from '@/content/store'

const minneapolis = await getCity('minneapolis')
const testville = await getCity('testville')

const countAnchors = (html: string) => html.match(/<a[\s>]/g)?.length ?? 0

describe('ServiceArea', () => {
  it('renders a no-suburb-pages city unlinked, with every name', () => {
    const html = renderToStaticMarkup(
      <ServiceArea
        areas={areasData(testville).areas}
        bits={cityBits(testville)}
        mapSrc={testville.maps.front}
        hasSuburbPages={false}
      />,
    )
    expect(countAnchors(html)).toBe(0)
    expect(html).toContain('North Testburg')
    expect(html).toContain('Faketon')
    expect(html).toContain('Mockville')
    // maps.front is null for the fixture: no broken embed, no iframe at all.
    expect(html).not.toContain('<iframe')
  })

  it('renders a suburb-pages draft city linked, with the preview prefix', () => {
    const html = renderToStaticMarkup(
      <ServiceArea
        areas={areasData(testville).areas}
        bits={cityBits(testville)}
        mapSrc={testville.maps.front}
        hasSuburbPages={testville.hasSuburbPages}
      />,
    )
    expect(testville.hasSuburbPages).toBe(true)
    expect(countAnchors(html)).toBe(3)
    expect(html.match(/<a\b[^>]*\bhref="([^"]+)"/)?.[1]).toBe(
      '/testville/house-cleaning-north-testburg',
    )
  })

  it('renders Minneapolis exactly as before: 24 links, live slugs, grid-rows-12', () => {
    const html = renderToStaticMarkup(
      <ServiceArea
        areas={areasData(minneapolis).areas}
        bits={cityBits(minneapolis)}
        mapSrc={minneapolis.maps.front}
        hasSuburbPages={minneapolis.hasSuburbPages}
      />,
    )
    expect(countAnchors(html)).toBe(24)
    expect(html.match(/<a\b[^>]*\bhref="([^"]+)"/)?.[1]).toBe('/house-cleaning-apple-valley')
    // The literal class must survive (Tailwind extracts it statically) and the
    // 24-entry case must emit NO inline style attribute on the <ul>.
    expect(html).toContain('grid-rows-12')
    expect(html).not.toContain('gridTemplateRows')
    expect(html).not.toContain('grid-template-rows')
  })

  it('derives the row count from the list length for a non-24 city', () => {
    const html = renderToStaticMarkup(
      <ServiceArea
        areas={areasData(testville).areas}
        bits={cityBits(testville)}
        mapSrc={null}
        hasSuburbPages={false}
      />,
    )
    // 3 suburbs -> ceil(3/2) = 2 rows, expressed inline because the class is
    // pinned to Minneapolis's 12.
    expect(html).toContain('grid-template-rows:repeat(2, minmax(0, 1fr))')
  })
})

describe('Locations', () => {
  it('renders every name of a no-suburb-pages city, unlinked and undropped', () => {
    const { zipParagraph, landmarksParagraph } = homeData(testville)
    const html = renderToStaticMarkup(
      <Locations
        areas={areasData(testville).areas}
        zipParagraph={zipParagraph}
        landmarksParagraph={landmarksParagraph}
        mapSrc={testville.maps.home}
        hasSuburbPages={false}
      />,
    )
    expect(countAnchors(html)).toBe(0)
    for (const s of testville.research.suburbs) expect(html).toContain(s.name)
  })

  it('links all 3 Testville names once its own hasSuburbPages is true', () => {
    const { zipParagraph, landmarksParagraph } = homeData(testville)
    const html = renderToStaticMarkup(
      <Locations
        areas={areasData(testville).areas}
        zipParagraph={zipParagraph}
        landmarksParagraph={landmarksParagraph}
        mapSrc={testville.maps.home}
        hasSuburbPages={testville.hasSuburbPages}
      />,
    )
    expect(testville.hasSuburbPages).toBe(true)
    expect(countAnchors(html)).toBe(3)
    for (const s of testville.research.suburbs) expect(html).toContain(s.name)
  })

  it('keeps all 24 Minneapolis names linked across the two paragraphs', () => {
    const { zipParagraph, landmarksParagraph } = homeData(minneapolis)
    const html = renderToStaticMarkup(
      <Locations
        areas={areasData(minneapolis).areas}
        zipParagraph={zipParagraph}
        landmarksParagraph={landmarksParagraph}
        mapSrc={minneapolis.maps.home}
        hasSuburbPages={minneapolis.hasSuburbPages}
      />,
    )
    expect(countAnchors(html)).toBe(24)
    for (const s of minneapolis.research.suburbs) expect(html).toContain(s.name)
  })
})

describe('cityHref-built navigation', () => {
  it('prefixes a draft city’s nav with its preview key', () => {
    const { site, innerSite } = siteData(testville)
    expect(site.nav[0].href).toBe('/testville/home')
    expect(site.nav.every((n) => n.href.startsWith('/testville/'))).toBe(true)
    expect(site.bookingUrl).toBe('/testville/book-now')
    expect(innerSite.bookUrl).toBe('/testville/book')
    expect(areasData(testville).areas[0].href).toBe(
      '/testville/house-cleaning-north-testburg',
    )
  })

  it('leaves a live city’s nav on its public paths', () => {
    const { site, innerSite } = siteData(minneapolis)
    expect(site.nav[0].href).toBe('/home')
    expect(site.nav[2].href).toBe('/deep-cleaning-minneapolis')
    expect(site.bookingUrl).toBe('/book-now')
    expect(innerSite.bookUrl).toBe('/book')
    expect(areasData(minneapolis).areas[0].href).toBe('/house-cleaning-apple-valley')
  })
})
