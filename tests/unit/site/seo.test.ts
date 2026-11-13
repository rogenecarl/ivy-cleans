import { describe, expect, it } from 'vitest'
import { canonicalFor, cityRobots } from '@/site/data/seo'
import { isPreviewHost } from '@/server/content/resolve-rewrite'
import { getCity } from '@/server/content/store'
import { csMeta } from '@/site/data/cleaning-services'
import { contactData } from '@/site/data/contact'
import { faqPageMeta } from '@/site/data/faq-page'
import { bookData } from '@/site/data/book'
import { blogMeta } from '@/site/data/blog'

const noindex = { robots: { index: false, follow: false } }

describe('cityRobots', () => {
  it('keeps a draft out of the index', () => {
    expect(cityRobots({ city: 'Houston', status: 'draft' })).toEqual(noindex)
  })

  it('keeps a live city with no domain out of the index: it exists only at /<key>', () => {
    expect(cityRobots({ city: 'Houston', status: 'live' })).toEqual(noindex)
  })

  it('indexes a live city on its own domain', () => {
    expect(cityRobots({ city: 'Houston', status: 'live', domain: 'ivycleanshouston.com' })).toEqual({})
  })

  it('indexes the default city, which has the operator host instead of a domain', () => {
    expect(cityRobots({ city: 'Minneapolis', status: 'live' })).toEqual({})
  })
})

describe('canonicalFor', () => {
  const live = { status: 'live', domain: 'ivycleanshouston.com' } as const

  it("points every page at the city's own domain", () => {
    expect(canonicalFor(live, '/contact')).toEqual({ alternates: { canonical: 'https://ivycleanshouston.com/contact' } })
  })

  it('points the front page at the bare domain', () => {
    expect(canonicalFor(live, '/')).toEqual({ alternates: { canonical: 'https://ivycleanshouston.com' } })
  })

  it('claims nothing for a draft or a city with no domain', () => {
    expect(canonicalFor({ status: 'draft', domain: 'ivycleanshouston.com' }, '/contact')).toEqual({})
    expect(canonicalFor({ status: 'live' }, '/contact')).toEqual({})
  })
})

describe('isPreviewHost', () => {
  it('is true for the vercel.app host and preview deployments', () => {
    expect(isPreviewHost('ivycleans.vercel.app')).toBe(true)
    expect(isPreviewHost('ivy-cleans-git-dev-team.vercel.app:443')).toBe(true)
  })

  it('is false for a real domain and for localhost', () => {
    expect(isPreviewHost('ivycleans.com')).toBe(false)
    expect(isPreviewHost('notvercel.app')).toBe(false)
    expect(isPreviewHost('localhost:3000')).toBe(false)
  })
})

const c = await getCity('minneapolis')

describe('inner page titles name the city', () => {
  const metas = {
    'cleaning-services': csMeta(c),
    contact: contactData(c).contactMeta,
    faq: faqPageMeta(c),
    book: bookData(c).bookMeta,
    'book-now': bookData(c).bookNowMeta,
    blog: blogMeta(c),
  }

  for (const [page, meta] of Object.entries(metas)) {
    it(`${page}: title and description carry "Minneapolis, MN"`, () => {
      expect(meta.title).toContain('Minneapolis, MN')
      expect(meta.title).toContain('Ivy Cleans')
      expect(meta.description).toContain('Minneapolis, MN')
      expect(meta.description.length).toBeLessThanOrEqual(155)
    })
  }

  it('gives every page a different title', () => {
    const titles = Object.values(metas).map((m) => m.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})
