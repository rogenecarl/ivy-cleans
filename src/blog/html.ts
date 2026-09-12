import sanitizeHtml from 'sanitize-html'
import type { CityContent } from '@/content/types'
import { tenantHref } from '@/data/routes'

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'a', 'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre',
    'blockquote', 'ul', 'ol', 'li', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div', 'sup', 'sub',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
}

/** The delivered body, sanitized, every link kept on the tenant, and the duplicated title heading removed. */
export function cleanArticleHtml(html: string, title: string, c: CityContent): string {
  const cleaned = sanitizeHtml(html, {
    ...OPTIONS,
    transformTags: {
      a: (tagName, attribs): sanitizeHtml.Tag => {
        const href = tenantHref(c, attribs.href ?? '')
        if (href === null || href === '') return { tagName: 'span', attribs: {} }
        const out: sanitizeHtml.Attributes = { href }
        if (/^https?:\/\//i.test(href)) {
          out.rel = 'noopener nofollow'
          out.target = '_blank'
        }
        return { tagName, attribs: out }
      },
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
    },
  })
  return stripTitleHeading(cleaned, title).trim()
}

// the tool opens the body with the title as an <h1>; the template renders its own
function stripTitleHeading(html: string, title: string): string {
  const match = /^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)
  if (!match) return html
  if (normalizeWords(plainText(match[1])) !== normalizeWords(title)) return html
  return html.slice(match[0].length)
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
