import { describe, expect, it } from 'vitest'
import { getCity } from '../src/content/store'
import type { CityContent, MarketOps } from '../src/content/types'
import { aboutData, aboutReady } from '../src/data/about'
import { siteData } from '../src/data/site'
import { sitePaths } from '../src/data/routes'
import { localBusinessJsonLd } from '../src/data/structured-data'
import { linkGraph } from '../src/data/link-graph'
import { ABOUT_STORY_SLOT } from '../src/pipeline/about'

const houston = await getCity('houston')

const ops: MarketOps = {
  servingSince: '2024-03',
  crewLead: 'Maria',
  crewSize: 4,
  homesCleaned: 340,
  insurance: 'Insured and bonded in Texas',
  reviews: [{ quote: 'They got the grout white again.', firstName: 'Ana', area: 'Katy', date: '2025-06' }],
  photos: [
    { path: '/photos/houston/1-crew.jpg', alt: 'Maria and the crew outside a Katy home' },
    { path: '/photos/houston/2-van.jpg', alt: 'The Houston van' },
  ],
  profiles: [{ label: 'Google Business Profile', url: 'https://g.page/ivycleans-houston' }],
}

const withAbout: CityContent = {
  ...houston,
  ops,
  sections: { ...houston.sections, [ABOUT_STORY_SLOT]: ['Ivy Cleans has cleaned Houston homes since March 2024.', 'Maria leads the crew.'] },
}

describe('about page data', () => {
  it('is off until serving-since, crew lead and a photo exist', () => {
    expect(aboutReady(houston.ops)).toBe(false)
    expect(aboutReady({ ...ops, photos: [] })).toBe(false)
    expect(aboutReady(ops)).toBe(true)
  })

  it('prints only what the operator typed, plus the researched area list', () => {
    const about = aboutData(withAbout)
    expect(about.h1).toBe('About Ivy Cleans in Houston')
    expect(about.facts).toEqual([
      { label: 'Serving Houston since', value: 'March 2024' },
      { label: 'Crew', value: '4 people' },
      { label: 'Homes cleaned here', value: '340' },
    ])
    // the photo captioned "crew" is the crew photo and leaves the gallery
    expect(about.crew).toEqual({ lead: 'Maria', photo: ops.photos![0], placeholder: false })
    expect(about.photos).toEqual([ops.photos![1]])
    expect(about.story).toHaveLength(2)
    expect(about.reviews).toHaveLength(1)
    expect(about.meta.title).toBe('About Ivy Cleans in Houston, TX | Ivy Cleans')
    expect(about.meta.description).toContain('serving since March 2024')
  })

  it('leaves the story out when none was written', () => {
    expect(aboutData({ ...houston, ops }).story).toBeUndefined()
  })

  it('shows the placeholder until a photo is captioned as the crew', () => {
    const about = aboutData({ ...houston, ops: { ...ops, photos: [ops.photos![1]] } })
    expect(about.crew.placeholder).toBe(true)
    expect(about.crew.photo.path).toBe('/images/crew-placeholder.svg')
    expect(about.photos).toEqual([ops.photos![1]])
  })
})

describe('about page wiring', () => {
  it('joins the nav, the footer and the sitemap only when on', () => {
    expect(siteData(houston).site.nav.map((l) => l.label)).not.toContain('About Us')
    expect(sitePaths(houston)).not.toContain('/about')

    const { site, innerSite } = siteData(withAbout)
    expect(site.nav.map((l) => l.label)).toEqual(['Home', 'Cleaning Services', 'About Us', 'Blog', 'Contact', 'FAQ'])
    expect(innerSite.footerLinks.map((l) => l.label)).toEqual(['Home', 'About Us', 'Blog', 'Contact', 'FAQ', 'Privacy Policy'])
    expect(sitePaths(withAbout)).toContain('/about')
  })

  it('sits in the link graph with a breadcrumb and links to contact and booking', () => {
    const graph = linkGraph(withAbout)
    expect(graph.problems).toEqual([])
    expect(graph.crumbs.get('/about')).toBe(2)
    const outbound = graph.edges.get('/about')!
    expect(outbound.has('/contact')).toBe(true)
    expect(outbound.has('/book')).toBe(true)
  })

  it('carries the profiles as sameAs on the business node', () => {
    const node = localBusinessJsonLd({ ...withAbout, address: '1200 Main St, Houston, TX 77002' })
    expect(node?.sameAs).toEqual(['https://g.page/ivycleans-houston'])
    expect(node?.foundingDate).toBe('2024-03')
  })
})
