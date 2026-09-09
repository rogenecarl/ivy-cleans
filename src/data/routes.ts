import type { CityContent } from '../content/types'
import { cityHref, citySlug } from '../content/interpolate'
import { SERVICE_SLUGS } from './services/registry'
import { postSlugs } from './posts'

/** Every path a tenant serves, relative to the city root. */
export function sitePaths(c: CityContent): string[] {
  return [
    '/',
    '/home',
    '/cleaning-services',
    '/contact',
    '/faq',
    '/book',
    '/book-now',
    '/blog',
    '/privacy-policy',
    ...SERVICE_SLUGS.map((slug) => `/services/${slug}`),
    ...postSlugs.map((slug) => `/${slug}`),
    // area pages only when hasSuburbPages: a URL that 404s is worse than none
    ...(c.hasSuburbPages ? c.research.suburbs.map((s) => `/${s.slug}`) : []),
  ]
}

const OWN_HOSTS = new Set(['ivycleans.com', 'www.ivycleans.com'])

// No link from one city site to another, ever. A link to ivycleans.com (or a bare path) becomes this tenant's own
// page when the tenant serves it, and null (render unlinked) when it doesn't. Other hosts pass through untouched.
export function tenantHref(c: CityContent, href: string): string | null {
  if (/^(tel:|mailto:|#)/i.test(href)) return href
  let path: string
  if (/^https?:\/\//i.test(href)) {
    let url: URL
    try {
      url = new URL(href)
    } catch {
      return null
    }
    if (!OWN_HOSTS.has(url.hostname.toLowerCase())) return href
    if (url.search !== '') return null // ?p=NNN style WordPress links point at posts no tenant serves
    path = url.pathname
  } else if (href.startsWith('/')) {
    path = href.split(/[?#]/)[0]
  } else {
    return null
  }
  path = path.replace(/\/+$/, '') || '/'
  // the two old city-named service URLs, on any city
  if (/^\/deep-cleaning-[a-z0-9-]+$/.test(path)) path = '/services/deep-cleaning'
  if (/^\/[a-z0-9-]+-move-out-cleaning-services$/.test(path)) path = '/services/move-in-move-out-cleaning'
  if (path === `/${citySlug(c.city)}`) path = '/'
  return sitePaths(c).includes(path) ? cityHref(c, path) : null
}
