// src/data/services/registry.ts
/*
 * The seven services, their URL slugs, and how each one renders.
 *
 * Slugs are the client's, verbatim, and are STORED rather than derived from
 * the display name: "Move In / Move Out Cleaning" does not slugify to
 * "move-in-move-out-cleaning" by any rule worth writing, and the live site
 * already proved that guessing URL patterns from names does not hold.
 *
 * Two kinds of entry. Six services render through the shared template in
 * src/components/service/ and supply a ServiceContent builder. Move-out keeps
 * its own five components, because its structure genuinely differs and putting
 * it on the template would change a page that is live today.
 */
import type { CityContent } from '@/content/types'
import type { ServiceContent } from '@/data/service-types'
import { deepCleaningData } from '@/data/deep-cleaning'
import { standardCleaningData } from './standard'
import { apartmentCleaningData } from './apartment'
import { airbnbCleaningData } from './airbnb'
import { postConstructionCleaningData } from './post-construction'
import { preListingCleaningData } from './pre-listing'

export const SERVICE_SLUGS = [
  'standard-cleaning',
  'deep-cleaning',
  'move-in-move-out-cleaning',
  'apartment-cleaning',
  'airbnb-cleaning',
  'post-construction-cleaning',
  'pre-listing-cleaning',
] as const

export type ServiceSlug = (typeof SERVICE_SLUGS)[number]

export type ServiceEntry =
  | { slug: ServiceSlug; name: string; kind: 'template'; content: (c: CityContent) => ServiceContent }
  | { slug: ServiceSlug; name: string; kind: 'bespoke' }

const ENTRIES: ServiceEntry[] = [
  { slug: 'standard-cleaning', name: 'Standard Cleaning', kind: 'template', content: standardCleaningData },
  { slug: 'deep-cleaning', name: 'Deep Cleaning', kind: 'template', content: deepCleaningData },
  { slug: 'move-in-move-out-cleaning', name: 'Move In / Move Out Cleaning', kind: 'bespoke' },
  { slug: 'apartment-cleaning', name: 'Apartment & Condo Cleaning', kind: 'template', content: apartmentCleaningData },
  { slug: 'airbnb-cleaning', name: 'Airbnb & Short-Term Rental Cleaning', kind: 'template', content: airbnbCleaningData },
  {
    slug: 'post-construction-cleaning',
    name: 'Post-Construction & Renovation Cleaning',
    kind: 'template',
    content: postConstructionCleaningData,
  },
  {
    slug: 'pre-listing-cleaning',
    name: 'Real Estate & Pre-Listing Cleaning',
    kind: 'template',
    content: preListingCleaningData,
  },
]

export function serviceBySlug(slug: string): ServiceEntry | undefined {
  return ENTRIES.find((e) => e.slug === slug)
}
