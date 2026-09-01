/*
 * The blog-post template and the post data behind it.
 *
 * The live site serves posts at the ROOT of a site (/how-to-clean-bathroom-walls),
 * so they render through the same [slug] segment as suburb pages. These tests
 * pin the two things that would silently rot: that every post URL the site
 * links to is accounted for, and that the copy in src/data/posts still matches
 * the captured reference HTML it was transcribed from.
 *
 * Server components with no client-only hooks, so renderToStaticMarkup in
 * plain node is enough — no jsdom, no Next runtime.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { posts, postSlugs } from '@/data/posts'
import type { ArticleBlock, Inline } from '@/data/posts/types'
import { blogCards } from '@/data/blog'
import { posts as recentPosts } from '@/data/recent-posts'
import PostArticle from '@/components/blog/PostArticle'
import CommentFormDisplay from '@/components/blog/CommentFormDisplay'

const REF = 'docs/superpowers/reference/ivycleans-live'

/*
 * Two slugs the blog listing links to are NOT on this template: live builds
 * them as bespoke Elementor pages (elementor-page-2248 / -2262) carrying none
 * of the post-title, post-info, share, author-box or comment widgets the
 * template renders. They are deliberately absent from src/data/posts rather
 * than rendered through the wrong layout.
 */
const OFF_TEMPLATE = ['how-to-clean-smoke-detectors', 'what-to-do-in-st-louis-park-mn']

// The capture filename differs for the one post transcribed in an earlier round.
const refHtml = (slug: string) =>
  readFileSync(
    slug === 'do-i-need-to-be-home-during-a-deep-cleaning-service'
      ? `${REF}/blog-post.html`
      : `${REF}/post-${slug}.html`,
    'utf8',
  )

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8211;/g, '–')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')

const flatten = (runs: Inline[]): string =>
  runs
    .map((r) => {
      if (typeof r === 'string') return r
      if ('b' in r) return flatten(r.b)
      if ('i' in r) return flatten(r.i)
      return flatten(r.a)
    })
    .join('')

/*
 * The runs of copy a block contributes, each of which must survive verbatim.
 * A list yields one string PER ITEM: the items are separate <li> elements on
 * the page, so concatenating them would produce a string that appears nowhere
 * in the source and the check would never pass.
 */
const blockTexts = (b: ArticleBlock): string[] => {
  if (b.type === 'img') return []
  if (b.type === 'ul' || b.type === 'ol') return b.items.map(flatten)
  return [flatten(b.text)]
}

describe('post coverage', () => {
  it('covers every slug the blog listing and the front-page recent posts link to', () => {
    const linked = [...blogCards, ...recentPosts].map((x) => x.href.slice(1))
    const missing = linked.filter((s) => !postSlugs.includes(s) && !OFF_TEMPLATE.includes(s))
    expect(missing).toEqual([])
  })

  it('keys each post by the slug it stores', () => {
    for (const [slug, post] of Object.entries(posts)) expect(post.slug).toBe(slug)
  })

  it('holds no post that is off this template', () => {
    for (const slug of OFF_TEMPLATE) expect(postSlugs).not.toContain(slug)
  })
})

describe('post data matches the captured live HTML', () => {
  for (const slug of postSlugs) {
    it(`${slug} keeps the live H1, <title> and byline`, () => {
      const html = refHtml(slug)
      const h1 = /elementor-page-title[^>]*>[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)
      expect(h1).not.toBeNull()
      expect(decode(h1![1].trim())).toBe(posts[slug].h1)
      expect(decode(/<title>([\s\S]*?)<\/title>/.exec(html)![1])).toBe(posts[slug].meta.title)
      // The byline is the author-box name, which differs from "aj" on one post.
      const author = /elementor-author-box__name[^>]*>([\s\S]*?)</.exec(html)
      expect(decode(author![1].trim())).toBe(posts[slug].authorBox.name)
    })

    it(`${slug} keeps its body copy verbatim`, () => {
      // Every paragraph, heading and list item must still appear, character for
      // character, in the captured page. This is what stops a well-meaning
      // copy-edit — a straightened apostrophe, a stripped trailing nbsp, a
      // fixed typo — from drifting the clone away from the live site.
      const plain = decode(refHtml(slug).replace(/<[^>]+>/g, ''))
      for (const block of posts[slug].blocks) {
        for (const run of blockTexts(block)) {
          const text = run.trim()
          if (text === '') continue
          expect(plain, `${slug}: missing block text`).toContain(text)
        }
      }
    })
  }
})

describe('PostArticle', () => {
  it('renders the hero only for the posts that have a featured image', () => {
    // Four of the nine posts have no featured image, and live renders no hero
    // widget at all for those rather than an empty one.
    const withHero = postSlugs.filter((s) => posts[s].heroImage !== undefined)
    expect(withHero.length).toBe(5)
    for (const slug of postSlugs) {
      const html = renderToStaticMarkup(<PostArticle post={posts[slug]} />)
      const hero = posts[slug].heroImage
      expect(html.includes('aspect-[870/382]')).toBe(hero !== undefined)
    }
  })

  it('renders every block type the posts actually use', () => {
    const used = new Set(postSlugs.flatMap((s) => posts[s].blocks.map((b) => b.type)))
    expect([...used].sort()).toEqual(['h1', 'h2', 'h3', 'img', 'ol', 'p', 'ul'])
  })

  it('renders lists, inline links, bold and italic inside the body copy', () => {
    const html = postSlugs.map((s) => renderToStaticMarkup(<PostArticle post={posts[s]} />)).join('')
    expect(html).toContain('list-disc')
    expect(html).toContain('list-decimal')
    // `bolder`, not a fixed weight: it is what live resolves, and it is the only
    // value that yields 700 in a paragraph and 900 in a heading off <strong>.
    expect(html).toContain('[font-weight:bolder]')
    expect(html).toContain('<em>')
    expect(html).toContain('href="https://ivycleans.com/how-to-clean-bathroom-tiles/"')
  })

  it('renders the byline and author box from the post, not a hardcoded name', () => {
    const html = renderToStaticMarkup(
      <PostArticle post={posts['10-questions-to-ask-house-cleaning-services-a-comprehensive-guide']} />,
    )
    expect(html).toContain('Support IvyCleans')
    // next/image rewrites src through /_next/image?url=<encoded>.
    expect(html).toContain(encodeURIComponent('/images/avatar-support-ivycleans.jpg'))
    expect(html).toContain('https://ivycleans.com/author/support/')
  })

  it('keeps the trailing empty paragraph two posts end with', () => {
    // An empty <p> paints nothing, but its 2rem bottom margin is real space on
    // the page. Dropping it as "no content" moved the share row up a full step
    // on both posts, so the extractor keeps empty paragraphs.
    for (const slug of ['guide-to-basement-cleaning-services-near-you', 'cleaning-co-redefining-cleaning-standards']) {
      const last = posts[slug].blocks[posts[slug].blocks.length - 1]
      expect(last.type, slug).toBe('p')
      expect(last.type === 'p' && last.text, slug).toEqual([])
    }
  })

  it('gives every image a positive render size', () => {
    for (const slug of postSlugs) {
      for (const b of posts[slug].blocks) {
        if (b.type !== 'img') continue
        expect(b.width, `${slug} ${b.src}`).toBeGreaterThan(0)
        expect(b.height, `${slug} ${b.src}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('CommentFormDisplay', () => {
  it('renders the pingback list only for the posts that have one', () => {
    const withResponses = postSlugs.filter((s) => posts[s].responses !== undefined)
    expect(withResponses.length).toBe(3)
    const bare = renderToStaticMarkup(<CommentFormDisplay />)
    expect(bare).not.toContain('One Response')
    expect(bare).toContain('Leave a Reply')

    const withOne = renderToStaticMarkup(
      <CommentFormDisplay responses={posts['guide-to-basement-cleaning-services-near-you'].responses} />,
    )
    expect(withOne).toContain('One Response')
    expect(withOne).toContain('Pingback:')
    expect(withOne).toContain('https://ivycleans.com/order-of-cleaning-a-house/')
  })
})
