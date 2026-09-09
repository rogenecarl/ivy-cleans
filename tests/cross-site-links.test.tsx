/*
 * No link from one city site to another, ever — including ivycleans.com. A live link to ivycleans.com becomes
 * this tenant's own page when the tenant serves it, and plain text when it doesn't.
 */
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PostArticle from '@/components/blog/PostArticle'
import CommentFormDisplay from '@/components/blog/CommentFormDisplay'
import Pagination from '@/components/blog/Pagination'
import ServicesList from '@/components/service/ServicesList'
import { posts, postSlugs } from '@/data/posts'
import { postForCity } from '@/data/posts/tenant'
import { sitePaths, tenantHref } from '@/data/routes'
import { SERVICE_SLUGS, serviceBySlug } from '@/data/services/registry'
import { validateCityContent } from '@/content/validate'
import { getCity } from '@/content/store'
import { loadCityFixture } from './fixtures/cities/load'

const minneapolis = await getCity('minneapolis')
const testville = await loadCityFixture('testville')

const hrefs = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1])

describe('tenantHref', () => {
  it('maps an ivycleans.com URL onto the tenant when the tenant serves that path', () => {
    expect(tenantHref(minneapolis, 'https://ivycleans.com/do-i-need-to-be-home-during-a-deep-cleaning-service/')).toBe(
      '/do-i-need-to-be-home-during-a-deep-cleaning-service',
    )
    expect(tenantHref(testville, 'https://ivycleans.com/do-i-need-to-be-home-during-a-deep-cleaning-service/')).toBe(
      '/testville/do-i-need-to-be-home-during-a-deep-cleaning-service',
    )
    expect(tenantHref(minneapolis, 'https://ivycleans.com/')).toBe('/')
    expect(tenantHref(testville, 'https://ivycleans.com')).toBe('/testville')
    expect(tenantHref(testville, 'https://ivycleans.com/deep-cleaning-minneapolis/')).toBe('/testville/services/deep-cleaning')
  })

  it('unlinks paths the tenant does not serve', () => {
    for (const url of [
      'https://ivycleans.com/author/aj/',
      'https://ivycleans.com/how-to-clean-a-bathroom/',
      'https://ivycleans.com/?p=1063',
      'https://ivycleans.com/how-to-clean-smoke-detectors/',
      '/blog/2/',
    ]) {
      expect(tenantHref(minneapolis, url), url).toBeNull()
    }
  })

  it('leaves other hosts, tel: and mailto: alone', () => {
    expect(tenantHref(minneapolis, 'https://www.facebook.com/ivycleans')).toBe('https://www.facebook.com/ivycleans')
    expect(tenantHref(minneapolis, 'tel:+16125550142')).toBe('tel:+16125550142')
    expect(tenantHref(minneapolis, 'mailto:support@ivycleans.com')).toBe('mailto:support@ivycleans.com')
  })
})

describe('rendered template links stay inside the tenant', () => {
  for (const c of [minneapolis, testville]) {
    it(`${c.city}: posts, pingbacks, pagination and service lists never link to ivycleans.com`, () => {
      const served = new Set(sitePaths(c))
      let html = renderToStaticMarkup(<Pagination />)
      for (const slug of postSlugs) {
        const post = postForCity(posts[slug], c)
        html += renderToStaticMarkup(<PostArticle post={post} />)
        html += renderToStaticMarkup(<CommentFormDisplay responses={post.responses} />)
      }
      for (const slug of SERVICE_SLUGS) {
        const entry = serviceBySlug(slug)!
        if (entry.kind !== 'template') continue
        const content = entry.content(c)
        html += renderToStaticMarkup(
          <ServicesList
            services={content.services}
            servicesLinkHref={content.servicesLinkHref}
            servicesLinkedItemIndex={content.servicesLinkedItemIndex}
            bookHref="/book"
          />,
        )
      }
      expect(html).not.toContain('ivycleans.com/')
      for (const href of hrefs(html)) {
        if (/^(https?:|tel:|mailto:|#)/.test(href)) continue
        const bare = c.status === 'live' ? href : href.replace(/^\/testville/, '') || '/'
        expect(served.has(bare), href).toBe(true)
      }
    })
  }

  it('a post keeps the links the tenant can serve and drops the rest as text', () => {
    const post = postForCity(posts['when-you-hire-a-company-for-deep-cleaning-your-house-do-you-tip-the-workers-too'], testville)
    const html = renderToStaticMarkup(<PostArticle post={post} />)
    const comments = renderToStaticMarkup(<CommentFormDisplay responses={post.responses} />)
    // the pingback points at a post this tenant serves, so it stays a link
    expect(comments).toContain('href="/testville/do-i-need-to-be-home-during-a-deep-cleaning-service"')
    // the author archive does not exist on a tenant: the box stays, unlinked
    expect(html).toContain(post.authorBox.name)
    expect(html).not.toContain('All Posts')
    expect(html).not.toContain('/author/')
  })
})

describe('validateCityContent refuses links in generated copy', () => {
  it('rejects a URL or domain inside a section', () => {
    for (const bad of ['See https://ivycleans.com/deep-cleaning-minneapolis/ for more.', 'Visit www.example.com today.', 'the ivycleans.com team']) {
      const doc = { ...minneapolis, sections: { ...minneapolis.sections, 'services.cards.dusting': bad } }
      expect(() => validateCityContent(doc)).toThrow(/link or domain/)
    }
  })
})
