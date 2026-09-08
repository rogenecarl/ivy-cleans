import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getCity } from '@/content/store'
import { loadRouting } from '@/content/resolve-rewrite'
import { cityHref } from '@/content/interpolate'
import { SERVICE_SLUGS } from '@/data/services/registry'
import type { CityContent } from '@/content/types'

/*
 * One sitemap per tenant, resolved from the request's Host header.
 *
 * WHY IT IS DYNAMIC: this deployment serves every city, so there is no single
 * correct answer at build time — ivycleansorlando.com must list Orlando's
 * routes at that host, not /orlando/… paths on somebody else's domain.
 * Reading headers() is what opts this route out of caching; the Next docs
 * put it plainly (03-file-conventions/01-metadata/sitemap.md:44): "sitemap.js
 * is a special Route Handler that is cached by default unless it uses a
 * Request-time API".
 *
 * WHY IT MATTERS: a new domain with a sitemap gets its pages indexed in
 * weeks. Without one, months — and these sites have nothing else pointing at
 * them, no inbound links and no history, so the sitemap is the only way
 * Google learns the area pages exist at all.
 *
 * The host map comes from loadRouting(), the same tables the proxy routes
 * with, so a sitemap can never describe a different site from the one the
 * proxy serves on that host.
 */
export const dynamic = 'force-dynamic'

/** Every path a tenant publishes, relative to the city root. Exported for
 * tests: this is the list, and a route that ships without appearing here is
 * a page Google is never told about. */
export function sitemapPaths(c: CityContent): string[] {
  return [
    '/',
    '/home',
    '/cleaning-services',
    '/contact',
    '/faq',
    '/book',
    '/book-now',
    '/blog',
    ...SERVICE_SLUGS.map((slug) => `/services/${slug}`),
    /*
     * Area pages, but only where hasSuburbPages is true. A city that renders
     * "Areas We Serve" unlinked has no such routes, and listing URLs that
     * 404 is worse than listing none: Search Console reports them as errors
     * against the whole property.
     */
    ...(c.hasSuburbPages ? c.research.suburbs.map((s) => `/${s.slug}`) : []),
  ]
}

/**
 * How recently a page's copy changed, as far as this repo can honestly say.
 *
 * Deliberately NOT `new Date()` on every entry. A sitemap claiming every one
 * of 25 pages changed at the moment it was fetched is a lie a crawler learns
 * to discount, and discounting it costs exactly the freshness signal the
 * sitemap exists to give. Absent is better than invented, so nothing here
 * carries lastModified until the pipeline records a real generation date.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get('host') ?? ''
  const { domains } = await loadRouting()
  const key = domains.hosts[host.toLowerCase().split(':')[0]] ?? domains.default

  let city: CityContent
  try {
    city = await getCity(key)
  } catch {
    // An unknown or unreadable host gets an empty sitemap rather than a 500.
    // A crawler reads an empty sitemap as "nothing to index yet", which is
    // recoverable; a 500 on /sitemap.xml can get the property flagged.
    return []
  }

  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  const origin = `${proto}://${host}`

  return sitemapPaths(city).map((path) => ({ url: `${origin}${cityHref(city, path)}` }))
}
