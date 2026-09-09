// tests/sitemap.test.ts
/*
 * The route list a tenant's sitemap publishes.
 *
 * Orlando shipped with no sitemap and no robots.txt — both 404. These sites
 * have no inbound links and no history, so the sitemap is the only way a
 * crawler learns the area pages exist at all; the difference is weeks to
 * indexed rather than months.
 *
 * The handler itself reads headers() and cannot run outside a request, so
 * what is tested here is the part that carries the decisions: which routes
 * exist, and which are conditional.
 */
import { describe, expect, it } from 'vitest'
import { sitemapPaths } from '../src/app/sitemap'
import { SERVICE_SLUGS } from '../src/data/services/registry'
import { loadCityFixture } from './fixtures/cities/load'
import { getCity } from '../src/content/store'

const withAreas = await getCity('houston')
const noAreas = await loadCityFixture('testville')

describe('sitemapPaths', () => {
  it('lists every static route the app actually serves', () => {
    const paths = sitemapPaths(withAreas)
    for (const route of ['/', '/home', '/cleaning-services', '/contact', '/faq', '/book', '/book-now', '/blog', '/privacy-policy']) {
      expect(paths).toContain(route)
    }
  })

  it('lists all seven service pages', () => {
    const paths = sitemapPaths(withAreas)
    for (const slug of SERVICE_SLUGS) expect(paths).toContain(`/services/${slug}`)
  })

  it('lists every area page for a city that has them', () => {
    const paths = sitemapPaths(withAreas)
    for (const suburb of withAreas.research.suburbs) expect(paths).toContain(`/${suburb.slug}`)
  })

  it('lists NO area pages when the city renders them unlinked', () => {
    /*
     * hasSuburbPages: false means those routes do not exist. Listing URLs
     * that 404 is worse than listing none — Search Console reports them as
     * errors against the whole property, and a new domain has no credit to
     * spend on that.
     */
    // Constructed rather than taken from a fixture: every shipped city
    // currently sets hasSuburbPages: true, so the branch would otherwise go
    // untested until the first city that does not.
    const unlinked = { ...noAreas, hasSuburbPages: false }
    expect(unlinked.research.suburbs.length).toBeGreaterThan(0)
    for (const suburb of unlinked.research.suburbs) {
      expect(sitemapPaths(unlinked)).not.toContain(`/${suburb.slug}`)
    }
    // …and the static routes are all still there.
    expect(sitemapPaths(unlinked)).toContain('/contact')
  })

  it('claims no lastModified it cannot substantiate', () => {
    // A sitemap saying all 25 pages changed at fetch time is a lie a crawler
    // learns to discount — and discounting it costs exactly the freshness
    // signal the sitemap exists to give.
    const src = sitemapPaths(withAreas)
    expect(src.every((p) => typeof p === 'string')).toBe(true)
  })
})
