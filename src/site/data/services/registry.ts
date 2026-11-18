// src/site/data/services/registry.ts
// The seven services. Slugs are the client's, stored not derived. Six render through the shared template; move-out is bespoke.
import type { CityContent } from '@/server/content/types'
import type { ServiceContent } from '@/site/data/service-types'
import { deepCleaningData } from '@/site/data/deep-cleaning'
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

// name: menu label, no city in it. searchName: the short query people type, for the page title
type ServiceEntryBase = { slug: ServiceSlug; name: string; searchName: string }

export type ServiceEntry =
  | (ServiceEntryBase & { kind: 'template'; content: (c: CityContent) => ServiceContent })
  | (ServiceEntryBase & { kind: 'bespoke' })

const ENTRIES: ServiceEntry[] = [
  { slug: 'standard-cleaning', name: 'Standard Cleaning', searchName: 'Standard Cleaning', kind: 'template', content: standardCleaningData },
  {
    slug: 'deep-cleaning',
    name: 'Deep Cleaning', searchName: 'Deep Cleaning',
    kind: 'template',
    content: deepCleaningData,
  },
  {
    slug: 'move-in-move-out-cleaning',
    name: 'Move In / Move Out Cleaning', searchName: 'Move Out Cleaning',
    kind: 'bespoke',
  },
  { slug: 'apartment-cleaning', name: 'Apartment & Condo Cleaning', searchName: 'Apartment & Condo Cleaning', kind: 'template', content: apartmentCleaningData },
  { slug: 'airbnb-cleaning', name: 'Airbnb & Short-Term Rental Cleaning', searchName: 'Airbnb Cleaning', kind: 'template', content: airbnbCleaningData },
  {
    slug: 'post-construction-cleaning',
    name: 'Post-Construction & Renovation Cleaning', searchName: 'Post-Construction Cleaning',
    kind: 'template',
    content: postConstructionCleaningData,
  },
  {
    slug: 'pre-listing-cleaning',
    name: 'Real Estate & Pre-Listing Cleaning', searchName: 'Pre-Listing Cleaning',
    kind: 'template',
    content: preListingCleaningData,
  },
]

export function serviceBySlug(slug: string): ServiceEntry | undefined {
  return ENTRIES.find((e) => e.slug === slug)
}

// every service in SERVICE_SLUGS order; the header dropdown is built from this. Returns a copy.
export function allServices(): ServiceEntry[] {
  return [...ENTRIES]
}

/** "{Service} in {City}, {ST} | Ivy Cleans", from the short search name so it fits before Google cuts it. */
export function serviceTitle(
  entry: Pick<ServiceEntry, 'searchName'>,
  c: Pick<CityContent, 'city' | 'state'>,
): string {
  return `${entry.searchName} in ${c.city}, ${c.state} | Ivy Cleans`
}
