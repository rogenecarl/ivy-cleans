import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

/*
 * robots.txt per tenant.
 *
 * Dynamic for the same reason sitemap.ts is: the sitemap URL it points at has
 * to be the one on THIS host. A build-time robots.txt would send every
 * customer domain's crawler to whichever host happened to be baked in.
 *
 * /admin is disallowed. It is behind a login either way — the (console)
 * layout guards it and every server action re-checks — so this is not what
 * protects it; it keeps operator screens out of the index, which is a
 * different problem. A crawled /admin/login is a page competing with the
 * city's own copy for the site's crawl budget.
 */
export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host') ?? ''
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'

  return {
    rules: { userAgent: '*', allow: '/', disallow: '/admin' },
    sitemap: `${proto}://${host}/sitemap.xml`,
  }
}
