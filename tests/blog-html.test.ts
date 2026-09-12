import { describe, expect, it } from 'vitest'
import { getCity } from '../src/content/store'
import { cleanArticleHtml, excerptOf, plainText } from '../src/blog/html'

const minneapolis = await getCity('minneapolis')

describe('cleanArticleHtml', () => {
  it('drops the leading h1 when it repeats the title', () => {
    const html = cleanArticleHtml('<h1>How to Clean Grout</h1><p>Start here.</p>', 'How to Clean Grout', minneapolis)
    expect(html).toBe('<p>Start here.</p>')
  })

  it('keeps a leading h1 that is not the title', () => {
    const html = cleanArticleHtml('<h1>Intro</h1><p>x</p>', 'How to Clean Grout', minneapolis)
    expect(html).toContain('<h1>Intro</h1>')
  })

  it('removes scripts, event handlers and javascript: links', () => {
    const html = cleanArticleHtml(
      '<p onclick="x()">a<script>alert(1)</script></p><a href="javascript:alert(1)">b</a><img src="x" onerror="y()">',
      't',
      minneapolis,
    )
    expect(html).not.toContain('script')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('javascript:')
  })

  it('maps ivycleans.com links onto the tenant and unlinks paths it does not serve', () => {
    const html = cleanArticleHtml(
      '<p><a href="https://ivycleans.com/deep-cleaning-minneapolis/">deep</a> <a href="https://ivycleans.com/nope/">gone</a></p>',
      't',
      minneapolis,
    )
    expect(html).toContain('<a href="/services/deep-cleaning">deep</a>')
    expect(html).toContain('<span>gone</span>')
  })

  it('keeps third-party links but marks them nofollow', () => {
    const html = cleanArticleHtml('<p><a href="https://www.epa.gov/mold">EPA</a></p>', 't', minneapolis)
    expect(html).toContain('href="https://www.epa.gov/mold"')
    expect(html).toContain('rel="noopener nofollow"')
  })

  it('lazy-loads images', () => {
    const html = cleanArticleHtml('<img src="https://x.test/a.png" alt="a">', 't', minneapolis)
    expect(html).toBe('<img src="https://x.test/a.png" alt="a" loading="lazy" />')
  })
})

describe('plainText / excerptOf', () => {
  it('strips tags and decodes entities', () => {
    expect(plainText('<p>Tom &amp; Jerry&nbsp;<b>go</b></p>')).toBe('Tom & Jerry go')
  })

  it('uses the first paragraph and cuts at a word', () => {
    const long = `<h2>Heading</h2><p>${'word '.repeat(60)}</p>`
    const excerpt = excerptOf(long)
    expect(excerpt.length).toBeLessThanOrEqual(161)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt).not.toContain('Heading')
  })
})
