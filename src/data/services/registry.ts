// src/data/services/registry.ts
// The seven services. Slugs are the client's, stored not derived. Six render through the shared template; move-out is bespoke.
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

// menu label, no city in it
type ServiceEntryBase = { slug: ServiceSlug; name: string }

export type ServiceEntry =
  | (ServiceEntryBase & { kind: 'template'; content: (c: CityContent) => ServiceContent })
  | (ServiceEntryBase & { kind: 'bespoke' })

const ENTRIES: ServiceEntry[] = [
  { slug: 'standard-cleaning', name: 'Standard Cleaning', kind: 'template', content: standardCleaningData },
  {
    slug: 'deep-cleaning',
    name: 'Deep Cleaning',
    kind: 'template',
    content: deepCleaningData,
  },
  {
    slug: 'move-in-move-out-cleaning',
    name: 'Move In / Move Out Cleaning',
    kind: 'bespoke',
  },
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

// every service in SERVICE_SLUGS order; the header dropdown is built from this. Returns a copy.
export function allServices(): ServiceEntry[] {
  return [...ENTRIES]
}

/** "{Service} Services in {City}, {ST} | Ivy Cleans" — from the registry name so tab, nav and breadcrumb agree. */
export function serviceTitle(
  entry: Pick<ServiceEntry, 'name'>,
  c: Pick<CityContent, 'city' | 'state'>,
): string {
  return `${entry.name} Services in ${c.city}, ${c.state} | Ivy Cleans`
}
