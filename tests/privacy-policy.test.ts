import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { privacyPolicyHeader, privacyPolicyMeta, privacyPolicyParagraphs } from '../src/data/privacy-policy'
import { reservedSlugs } from '../src/pipeline/stages'
import { sitemapPaths } from '../src/app/sitemap'
import { siteData } from '../src/data/site'
import { getCity } from '../src/content/store'

const REF = 'docs/superpowers/reference/ivycleans-live/privacy-policy.html'
const html = readFileSync(REF, 'utf-8')
const minneapolis = await getCity('minneapolis')

describe('privacy policy', () => {
  it('carries the live page copy verbatim', () => {
    const body = html.slice(html.indexOf('elementor-element-e217928'))
    const live = [...body.matchAll(/<p>([^<]+)<\/p>/g)].map((m) => m[1].trim())
    expect(privacyPolicyParagraphs).toEqual(live.slice(0, privacyPolicyParagraphs.length))
    expect(privacyPolicyParagraphs).toHaveLength(9)
    expect(html).toContain(`<title>${privacyPolicyMeta.title}</title>`)
    expect(html).toContain(`content="${privacyPolicyMeta.description}"`)
    expect(html).toContain(privacyPolicyHeader.overline)
    expect(html).toContain(`>${privacyPolicyHeader.h2}</h2>`)
  })

  it('is a route the site links to, lists in the sitemap, and reserves against area slugs', () => {
    expect(JSON.stringify(siteData(minneapolis))).toContain('"/privacy-policy"')
    expect(sitemapPaths(minneapolis)).toContain('/privacy-policy')
    expect(reservedSlugs('Orlando').has('privacy-policy')).toBe(true)
  })
})
