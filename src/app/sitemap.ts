import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getCity } from '@/content/store'
import { loadRouting } from '@/content/resolve-rewrite'
import { cityHref } from '@/content/interpolate'
import { sitePaths } from '@/data/routes'
import type { CityContent } from '@/content/types'

// One sitemap per tenant, resolved from the Host header: one deployment serves every city, so there's no build-time
// answer. headers() opts the route out of caching. Hosts come from loadRouting(), the same tables the proxy uses.
export const dynamic = 'force-dynamic'

/** Every path a tenant publishes, relative to the city root. */
export const sitemapPaths = sitePaths

// no lastModified on purpose: claiming every page changed on every fetch is a signal crawlers learn to discount
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get('host') ?? ''
  const { domains } = await loadRouting()
  const key = domains.hosts[host.toLowerCase().split(':')[0]] ?? domains.default

  let city: CityContent
  try {
    city = await getCity(key)
  } catch {
    // unknown host: empty sitemap, not a 500
    return []
  }

  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  const origin = `${proto}://${host}`

  return sitemapPaths(city).map((path) => ({ url: `${origin}${cityHref(city, path)}` }))
}
