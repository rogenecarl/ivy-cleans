import type { CityContent } from '../content/types'
import { realAddress } from '../content/interpolate'
import type { ServiceEntry } from './services/registry'

export const BUSINESS_ID = '/#business'

// Everything here is rendered in code from the city's own fields; the model writes none of it.
type JsonLd = Record<string, unknown>

function telephone(c: CityContent): string {
  return c.phoneHref.replace(/^tel:\s*/i, '')
}

/** The canonical LocalBusiness node, or null while the city has no real address — a placeholder address is a wrong fact. */
export function localBusinessJsonLd(c: CityContent): JsonLd | null {
  const address = realAddress(c.address)
  if (address === undefined) return null
  const node: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': BUSINESS_ID,
    name: 'Ivy Cleans',
    telephone: telephone(c),
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressLocality: c.city,
      addressRegion: c.state,
      addressCountry: 'US',
    },
    areaServed: c.research.suburbs.map((s) => ({ '@type': 'Place', name: s.name })),
  }
  if (c.ops?.servingSince) node.foundingDate = c.ops.servingSince
  if (c.ops?.photos?.length) node.image = c.ops.photos.map((p) => p.path)
  if (c.ops?.reviews?.length) {
    node.review = c.ops.reviews.map((r) => ({
      '@type': 'Review',
      reviewBody: r.quote,
      author: { '@type': 'Person', name: r.firstName },
      ...(r.date ? { datePublished: r.date } : {}),
    }))
  }
  return node
}

/** One service page's Service node. Points at the business node when it exists, else names the business inline. */
export function serviceJsonLd(c: CityContent, entry: Pick<ServiceEntry, 'name'>): JsonLd {
  const hasBusiness = realAddress(c.address) !== undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: entry.name,
    serviceType: entry.name,
    areaServed: { '@type': 'City', name: c.city },
    provider: hasBusiness
      ? { '@id': BUSINESS_ID }
      : { '@type': 'LocalBusiness', name: 'Ivy Cleans', telephone: telephone(c) },
  }
}
