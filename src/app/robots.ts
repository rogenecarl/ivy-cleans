import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

// robots.txt per tenant, dynamic so the sitemap URL is on THIS host. /admin disallowed to keep it out of the index (it's login-gated regardless).
export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host') ?? ''
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'

  return {
    rules: { userAgent: '*', allow: '/', disallow: '/admin' },
    sitemap: `${proto}://${host}/sitemap.xml`,
  }
}
