/*
 * Abdi's Orlando review, items 11, 12 and 13 — the template cleanup that is
 * pure structure: no prompt work, no data from the owner.
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CtaBand from '@/components/CtaBand'
import Packages from '@/components/Packages'
import { packagesData } from '@/data/packages'
import { siteData } from '@/data/site'
import { SERVICE_SLUGS, serviceBySlug, serviceTitle } from '@/data/services/registry'
import { cityBits, getCity } from '@/content/store'
import { loadCityFixture } from './fixtures/cities/load'

const minneapolis = await getCity('minneapolis')
const testville = await loadCityFixture('testville')

describe('item 11 · the CTA band is not a heading', () => {
  it('renders its line as a <p>, so three bands are not three identical h2s', () => {
    const html = renderToStaticMarkup(<CtaBand site={siteData(minneapolis).site} bits={cityBits(minneapolis)} />)
    expect(html).toContain('Ready For a Sparkling Clean House? Book Your Cleaning Service Minneapolis')
    // the band's own line is a paragraph; CtaCompact below it keeps its own markup
    expect(html).not.toMatch(/<h[1-6][^>]*>Ready For a Sparkling/)
    expect(html).toMatch(/<p[^>]*>Ready For a Sparkling/)
  })
})

describe('item 12 · service page titles', () => {
  it('follow "{Service} Services in {City}, {ST} | Ivy Cleans" from the registry name', () => {
    expect(serviceTitle(serviceBySlug('deep-cleaning')!, { city: 'Orlando', state: 'FL' })).toBe(
      'Deep Cleaning Services in Orlando, FL | Ivy Cleans',
    )
    expect(serviceTitle(serviceBySlug('move-in-move-out-cleaning')!, minneapolis)).toBe(
      'Move In / Move Out Cleaning Services in Minneapolis, MN | Ivy Cleans',
    )
    for (const slug of SERVICE_SLUGS) {
      const title = serviceTitle(serviceBySlug(slug)!, testville)
      expect(title.endsWith(` Services in ${testville.city}, ${testville.state} | Ivy Cleans`)).toBe(true)
      expect(title.startsWith(serviceBySlug(slug)!.name)).toBe(true)
    }
  })
})

describe('item 13 · seven cards, seven pages', () => {
  it('lists exactly the registered services, in registry order, titled as the registry names them', () => {
    const { packages } = packagesData(minneapolis)
    expect(packages.map((p) => p.title)).toEqual(SERVICE_SLUGS.map((slug) => serviceBySlug(slug)!.name))
    // the six cards with no page are gone
    for (const gone of ['Condo Cleaning', 'Rental Cleaning', 'Eco Friendly Green Cleaning', 'Commercial & Office Cleaning', 'Maid Service']) {
      expect(packages.map((p) => p.title)).not.toContain(gone)
    }
  })

  it('links every card to its own service page, inside the tenant', () => {
    expect(packagesData(minneapolis).packages.map((p) => p.href)).toEqual(
      SERVICE_SLUGS.map((slug) => `/services/${slug}`),
    )
    for (const p of packagesData(testville).packages) expect(p.href.startsWith('/testville/services/')).toBe(true)
  })

  it('renders each title as a link', () => {
    const { packagesIntro, packages } = packagesData(minneapolis)
    const html = renderToStaticMarkup(
      <Packages packagesIntro={packagesIntro} packages={packages} site={siteData(minneapolis).site} />,
    )
    for (const p of packages) {
      expect(html).toMatch(new RegExp(`<h3[^>]*><a [^>]*href="${p.href}"[^>]*>${p.title.replace(/&/g, '&amp;')}</a></h3>`))
    }
  })
})
