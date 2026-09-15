import sanitizeHtml from 'sanitize-html'
import type { CityContent } from '@/content/types'
import { tenantHref } from '@/data/routes'
import { cityHref } from '@/content/interpolate'

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'a', 'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre',
    'blockquote', 'ul', 'ol', 'li', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div', 'sup', 'sub', 'input',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    input: ['type', 'checked', 'disabled'],
  },
  // only the inert checkbox of a task list survives; any other input goes
  exclusiveFilter: (frame) => frame.tag === 'input' && frame.attribs.type !== 'checkbox',
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
}

/**
 * The delivered body, sanitized, every link kept on the tenant, and the duplicated title heading removed. `ownHosts`
 * are the hosts this site is served on right now (the delivery host, the mapped domain): links to them become paths.
 */
export function cleanArticleHtml(html: string, title: string, c: CityContent, ownHosts: string[] = []): string {
  const own = new Set(ownHosts.map((h) => h.toLowerCase().split(':')[0]).filter(Boolean))
  const cleaned = sanitizeHtml(html, {
    ...OPTIONS,
    transformTags: {
      a: (tagName, attribs): sanitizeHtml.Tag => {
        const href = siteHref(c, localizeHref(attribs.href ?? '', own))
        if (href === null || href === '') return { tagName: 'span', attribs: {} }
        const out: sanitizeHtml.Attributes = { href }
        if (/^https?:\/\//i.test(href)) {
          out.rel = 'noopener nofollow'
          out.target = '_blank'
        }
        return { tagName, attribs: out }
      },
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
      input: (tagName, attribs): sanitizeHtml.Tag =>
        attribs.type === 'checkbox'
          ? { tagName, attribs: { type: 'checkbox', disabled: '', ...('checked' in attribs ? { checked: '' } : {}) } }
          : { tagName, attribs: { type: 'text' } },
    },
  })
  return stripTitleHeading(cleaned, title).trim()
}

// an absolute link to a host this site is served on becomes a bare path, so tenantHref can judge it
function localizeHref(href: string, own: Set<string>): string {
  if (!/^https?:\/\//i.test(href)) return href
  try {
    const url = new URL(href)
    if (!own.has(url.hostname.toLowerCase())) return href
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return href
  }
}

const TOOL_POST = /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/

// tenantHref knows the fixed pages; tool posts under /blog/<slug> are served too
function siteHref(c: CityContent, href: string): string | null {
  const path = href.split(/[?#]/)[0].replace(/\/+$/, '')
  if (TOOL_POST.test(path)) return cityHref(c, path)
  return tenantHref(c, href)
}

// the tool opens the body with the title as an <h1>; the template renders its own
function stripTitleHeading(html: string, title: string): string {
  const match = /^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)
  if (!match) return html
  if (normalizeWords(plainText(match[1])) !== normalizeWords(title)) return html
  return html.slice(match[0].length)
}

/** Each table in its own horizontal scroll box, so a wide table never widens the page on a phone. */
export function wrapTables(html: string): string {
  return html.replace(/<table\b/g, '<div class="table-wrap"><table').replace(/<\/table>/g, '</table></div>')
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }

/** Tags removed and entities decoded; whitespace collapsed to single spaces. */
export function plainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&(#?\w+);/g, (m, name: string) => ENTITIES[name] ?? m)
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeWords(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const EXCERPT_LENGTH = 160

/** First paragraph of the body cut at a word boundary, for the listing card. */
export function excerptOf(html: string): string {
  const firstParagraph = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(html)
  const text = plainText(firstParagraph ? firstParagraph[1] : html)
  if (text.length <= EXCERPT_LENGTH) return text
  const cut = text.slice(0, EXCERPT_LENGTH)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 80))}…`
}
