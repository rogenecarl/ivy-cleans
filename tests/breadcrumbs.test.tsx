/*
 * Breadcrumbs — Abdi's Orlando review, item 15A.
 *
 * One array feeds both the visible trail and the BreadcrumbList JSON-LD, so
 * these pin the trail shapes per page kind, the draft-preview prefixing, and
 * that the two outputs come from the same list.
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Breadcrumbs from '@/components/inner/Breadcrumbs'
import ServiceArea from '@/components/ServiceArea'
import { AREAS_PATH, breadcrumbListJsonLd, breadcrumbs } from '@/data/breadcrumbs'
import { areasData } from '@/data/areas'
import { cityBits, getCity } from '@/content/store'
import { loadCityFixture } from './fixtures/cities/load'

const minneapolis = await getCity('minneapolis')
const testville = await loadCityFixture('testville')

const labels = (html: string) => [...html.matchAll(/<(?:a|span)[^>]*>([^<]+)<\/(?:a|span)>/g)].map((m) => m[1])

describe('breadcrumbs()', () => {
  it('a plain page is Home › {label}, bare paths for a live city', () => {
    expect(breadcrumbs(minneapolis, { kind: 'page', label: 'Contact', path: '/contact' })).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Contact', href: '/contact' },
    ])
  })

  it('a service is Home › Services › {registry name}', () => {
    expect(breadcrumbs(minneapolis, { kind: 'service', slug: 'deep-cleaning' })).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Services', href: '/cleaning-services' },
      { label: 'Deep Cleaning', href: '/services/deep-cleaning' },
    ])
  })

  it('an area is Home › Service Areas › {name}, with Service Areas pointing at the front-page list', () => {
    const trail = breadcrumbs(minneapolis, { kind: 'area', name: 'Edina', slug: 'house-cleaning-edina' })
    expect(trail.map((c) => c.label)).toEqual(['Home', 'Service Areas', 'Edina'])
    expect(trail[1].href).toBe(AREAS_PATH)
    expect(trail[2].href).toBe('/house-cleaning-edina')
  })

  it('a post is Home › Blog › {title}', () => {
    const trail = breadcrumbs(minneapolis, { kind: 'post', title: 'How to clean bathroom walls', slug: 'how-to-clean-bathroom-walls' })
    expect(trail.map((c) => c.label)).toEqual(['Home', 'Blog', 'How to clean bathroom walls'])
    expect(trail[1].href).toBe('/blog')
  })

  it('a draft city keeps every crumb inside its preview prefix', () => {
    const trail = breadcrumbs(testville, { kind: 'area', name: 'Faketon', slug: 'house-cleaning-faketon' })
    for (const crumb of trail) expect(crumb.href.startsWith('/testville')).toBe(true)
    expect(trail[0].href).toBe('/testville')
    expect(trail[1].href).toBe('/testville/#areas')
  })

  it('the JSON-LD is the same list, positioned from 1', () => {
    const trail = breadcrumbs(minneapolis, { kind: 'service', slug: 'standard-cleaning' })
    const ld = breadcrumbListJsonLd(trail) as { '@type': string; itemListElement: { position: number; name: string; item: string }[] }
    expect(ld['@type']).toBe('BreadcrumbList')
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2, 3])
    expect(ld.itemListElement.map((i) => i.name)).toEqual(trail.map((c) => c.label))
    expect(ld.itemListElement.map((i) => i.item)).toEqual(trail.map((c) => c.href))
  })
})

describe('<Breadcrumbs>', () => {
  const trail = breadcrumbs(minneapolis, { kind: 'area', name: 'Edina', slug: 'house-cleaning-edina' })

  it('links every crumb but the current page, which is text with aria-current', () => {
    const html = renderToStaticMarkup(<Breadcrumbs trail={trail} />)
    expect(html).toContain('aria-label="Breadcrumb"')
    expect(html.match(/<a /g)?.length).toBe(2)
    expect(html).toContain('href="/"')
    expect(html).toContain(`href="${AREAS_PATH}"`)
    expect(html).toMatch(/<span aria-current="page"[^>]*>Edina<\/span>/)
    expect(labels(html)).toContain('Service Areas')
  })

  it('emits the BreadcrumbList from the same trail', () => {
    const html = renderToStaticMarkup(<Breadcrumbs trail={trail} />)
    const m = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)
    expect(m).not.toBeNull()
    const ld = JSON.parse(m![1])
    expect(ld).toEqual(breadcrumbListJsonLd(trail))
  })

  it('cannot be broken out of by a title containing </script>', () => {
    const hostile = [{ label: 'Home', href: '/' }, { label: 'x</script><b>y', href: '/x' }]
    const html = renderToStaticMarkup(<Breadcrumbs trail={hostile} />)
    // exactly one closing script tag: the real one
    expect(html.match(/<\/script>/g)?.length).toBe(1)
    expect(JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)![1]).itemListElement[1].name).toBe('x</script><b>y')
  })

  it('renders nothing for a trail with no parent', () => {
    expect(renderToStaticMarkup(<Breadcrumbs trail={[{ label: 'Home', href: '/' }]} />)).toBe('')
  })
})

/*
 * Item 15B: the same Areas We Serve block on every service page, under its
 * own heading. The default rendering (front page) must be untouched — the
 * existing ServiceArea tests in render-city.test.tsx pin that — so this only
 * checks the override.
 */
describe('<ServiceArea heading=…>', () => {
  it('replaces the h2 and drops the Near Me eyebrow, keeping every area link', () => {
    const html = renderToStaticMarkup(
      <ServiceArea
        areas={areasData(minneapolis).areas}
        bits={cityBits(minneapolis)}
        mapSrc={null}
        hasSuburbPages={minneapolis.hasSuburbPages}
        heading={{ title: 'Where we do Deep Cleaning in Minneapolis' }}
      />,
    )
    expect(html).toContain('Where we do Deep Cleaning in Minneapolis')
    expect(html).not.toContain('Areas We Serve')
    expect(html).not.toContain('Near Me')
    expect(html.match(/<a /g)?.length).toBe(minneapolis.research.suburbs.length)
  })

  it('the front page sets the fragment id the area crumb points at', () => {
    const html = renderToStaticMarkup(
      <ServiceArea id="areas" areas={areasData(minneapolis).areas} bits={cityBits(minneapolis)} mapSrc={null} hasSuburbPages />,
    )
    expect(html).toContain('<section id="areas"')
    expect(AREAS_PATH).toBe('/#areas')
  })
})
