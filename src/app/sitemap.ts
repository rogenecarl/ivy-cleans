import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getCity, resolveCityKey } from '@/server/content/store'
import { loadRouting } from '@/server/content/resolve-rewrite'
import { cityHref } from '@/server/content/interpolate'
import { sitePaths } from '@/site/data/routes'
import type { CityContent } from '@/server/content/types'
import { listPosts } from '@/server/blog/store'

// One sitemap per tenant, resolved from the Host header: one deployment serves every city, so there's no build-time
// answer. headers() opts the route out of caching. Hosts come from loadRouting(), the same tables the proxy uses.
export const dynamic = 'force-dynamic'

/** Every path a tenant publishes, relative to the city root. */
export const sitemapPaths = sitePaths

// no lastModified on purpose: claiming every page changed on every fetch is a signal crawlers learn to discount
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get('host') ?? ''
  const { domains } = await loadRouting()
  const key = resolveCityKey(host, domains)

  let city: CityContent
  try {
    city = await getCity(key)
  } catch {
    // unknown host: empty sitemap, not a 500
    return []
  }

  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'
  const origin = `${proto}://${host}`

  let postPaths: string[] = []
  try {
    postPaths = (await listPosts(key)).map((p) => `/blog/${p.slug}`)
  } catch {
    // store unreachable: the fixed pages still list
  }
  return [...sitemapPaths(city), ...postPaths].map((path) => ({ url: `${origin}${cityHref(city, path)}` }))
}
