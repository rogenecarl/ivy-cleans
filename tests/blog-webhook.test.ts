import { describe, expect, it, vi } from 'vitest'
import { getCity } from '../src/content/store'
import { receiveDelivery, type ReceiveDeps } from '../src/blog/receive'
import { cityKeyForDomain } from '../src/blog/resolve-city'
import type { BlogPostInput, BlogPostRecord } from '../src/blog/types'

const TOKEN = 'secret-token'
const domains = { default: 'minneapolis', hosts: { 'ivycleansorlando.com': 'orlando' } }

function article(overrides: Record<string, unknown> = {}) {
  return {
    event: 'article.published',
    test: false,
    article: {
      id: 812,
      type: 'post',
      title: 'How to Clean a Screened Lanai',
      slug: 'how-to-clean-a-screened-lanai',
      path: null,
      content_html:
        '<h1>How to Clean a Screened Lanai</h1><p>A screened lanai collects pollen, lovebugs and irrigation spray through spring. Rinse the screens from the inside out before wiping the frame.</p><p>Second paragraph.</p>',
      seo: { title: 'Lanai Cleaning Guide', meta_description: 'Keep the lanai clear.' },
      og_image_url: 'https://blogr.ai/storage/articles/lanai.png',
      og_image_alt: 'A clean lanai',
      categories: ['House Cleaning'],
      tags: ['lanai'],
      published_at: '2026-09-12T09:30:00+00:00',
      ...overrides,
    },
    website: { domain: 'ivycleans.com' },
  }
}

function deps(overrides: Partial<ReceiveDeps> = {}) {
  const saved: BlogPostInput[] = []
  const revalidated: string[] = []
  const d: ReceiveDeps & { saved: BlogPostInput[]; revalidated: string[] } = {
    expectedToken: TOKEN,
    domains,
    getCity,
    upsertPost: vi.fn(async (input: BlogPostInput): Promise<BlogPostRecord> => {
      saved.push(input)
      return { ...input, id: 'row', updatedAt: new Date() }
    }),
    postBySlug: async () => null,
    candidatesOutside: async () => [],
    revalidate: (paths) => revalidated.push(...paths),
    saved,
    revalidated,
    ...overrides,
  }
  return d
}

const auth = `Bearer ${TOKEN}`
const host = 'ivycleans.vercel.app'

describe('cityKeyForDomain', () => {
  it('maps a mapped host, its www form, and the brand domain', () => {
    expect(cityKeyForDomain('ivycleansorlando.com', domains)).toBe('orlando')
    expect(cityKeyForDomain('https://www.ivycleansorlando.com/', domains)).toBe('orlando')
    expect(cityKeyForDomain('www.ivycleans.com', domains)).toBe('minneapolis')
    expect(cityKeyForDomain('ivycleansmiami.com', domains)).toBeNull()
  })
})

describe('receiveDelivery', () => {
  it('rejects a missing or wrong token, and everything when no token is configured', async () => {
    expect((await receiveDelivery({ authorization: null, body: article(), host }, deps())).status).toBe(401)
    expect((await receiveDelivery({ authorization: 'Bearer nope', body: article(), host }, deps())).status).toBe(401)
    expect((await receiveDelivery({ authorization: auth, body: article(), host }, deps({ expectedToken: null }))).status).toBe(401)
  })

  it('answers 200 to a test delivery and saves nothing', async () => {
    const d = deps()
    const body = { ...article(), test: true }
    const res = await receiveDelivery({ authorization: auth, body, host }, d)
    expect(res.status).toBe(200)
    expect(d.saved).toEqual([])
  })

  it('skips site pages with 200', async () => {
    const d = deps()
    const body = { ...article({ type: 'page', path: '/pricing/' }), event: 'page.published' }
    const res = await receiveDelivery({ authorization: auth, body, host }, d)
    expect(res).toEqual({ status: 200, body: { ok: true, skipped: 'page.published' } })
    expect(d.saved).toEqual([])
  })

  it('400s a malformed body', async () => {
    const res = await receiveDelivery({ authorization: auth, body: { event: 'article.published' }, host }, deps())
    expect(res.status).toBe(400)
  })

  it('422s an unmapped website domain', async () => {
    const body = { ...article(), website: { domain: 'ivycleansmiami.com' } }
    const res = await receiveDelivery({ authorization: auth, body, host }, deps())
    expect(res.status).toBe(422)
    expect(String(res.body.error)).toContain('ivycleansmiami.com')
  })

  it('stores a post under the city, strips the title heading, and returns the live URL', async () => {
    const d = deps()
    const res = await receiveDelivery({ authorization: auth, body: article(), host }, d)
    expect(res).toEqual({ status: 200, body: { ok: true, url: 'https://ivycleans.vercel.app/blog/how-to-clean-a-screened-lanai' } })
    expect(d.saved).toHaveLength(1)
    const post = d.saved[0]
    expect(post.cityKey).toBe('minneapolis')
    expect(post.externalId).toBe('812')
    expect(post.html.startsWith('<p>A screened lanai')).toBe(true)
    expect(post.excerpt.startsWith('A screened lanai collects')).toBe(true)
    expect(post.metaTitle).toBe('Lanai Cleaning Guide')
    expect(post.publishedAt.toISOString()).toBe('2026-09-12T09:30:00.000Z')
    expect(d.revalidated).toEqual(['/minneapolis/blog', '/minneapolis/blog/how-to-clean-a-screened-lanai', '/sitemap.xml'])
  })

  it('uses the mapped domain for the URL when the city has one', async () => {
    const body = { ...article(), website: { domain: 'ivycleansorlando.com' } }
    const res = await receiveDelivery({ authorization: auth, body, host }, deps())
    expect(res.body.url).toBe('https://ivycleansorlando.com/blog/how-to-clean-a-screened-lanai')
  })

  it('422s when the slug belongs to a different article on the same site', async () => {
    const d = deps({
      postBySlug: async () => ({ externalId: '999' }) as BlogPostRecord,
    })
    const res = await receiveDelivery({ authorization: auth, body: article(), host }, d)
    expect(res.status).toBe(422)
    expect(d.saved).toEqual([])
  })

  it('updates in place on a retry with the same id', async () => {
    const d = deps({ postBySlug: async () => ({ externalId: '812' }) as BlogPostRecord })
    const res = await receiveDelivery({ authorization: auth, body: article(), host }, d)
    expect(res.status).toBe(200)
    expect(d.saved).toHaveLength(1)
  })

  it('422s a near copy of a post on another site', async () => {
    const d = deps({
      candidatesOutside: async () => [
        {
          cityKey: 'houston',
          slug: 'lanai',
          title: 'Lanai Care in Houston',
          text: 'A screened lanai collects pollen, lovebugs and irrigation spray through spring. Rinse the screens from the inside out before wiping the frame. Second paragraph.',
        },
      ],
    })
    const res = await receiveDelivery({ authorization: auth, body: article(), host }, d)
    expect(res.status).toBe(422)
    expect(String(res.body.error)).toContain('houston/lanai')
    expect(d.saved).toEqual([])
  })
})
