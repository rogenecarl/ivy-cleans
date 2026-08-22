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

/*
 * `navLabel` exists because two of these services predate the /services/<slug>
 * URLs and their menu wording is matched byte-for-byte to the live WordPress
 * site ("Deep Cleaning Minneapolis", not "Deep Cleaning"). It is an
 * interpolation TEMPLATE -- it may contain {city} and friends -- and when it
 * is absent the plain `name` is used verbatim. Do not "tidy" the two that set
 * it; changing them changes a live header.
 */
type ServiceEntryBase = { slug: ServiceSlug; name: string; navLabel?: string }

export type ServiceEntry =
  | (ServiceEntryBase & { kind: 'template'; content: (c: CityContent) => ServiceContent })
  | (ServiceEntryBase & { kind: 'bespoke' })

const ENTRIES: ServiceEntry[] = [
  { slug: 'standard-cleaning', name: 'Standard Cleaning', kind: 'template', content: standardCleaningData },
  {
    slug: 'deep-cleaning',
    name: 'Deep Cleaning',
    navLabel: 'Deep Cleaning {city}',
    kind: 'template',
    content: deepCleaningData,
  },
  {
    slug: 'move-in-move-out-cleaning',
    name: 'Move In / Move Out Cleaning',
    navLabel: '{city} Move Out Cleaning Services',
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

/*
 * Every service, in SERVICE_SLUGS order (which is the client's own ordering).
 *
 * This is what the header dropdown is built from, so the menu and the pages
 * cannot drift apart: a service added here appears in the nav automatically,
 * and one that is removed cannot leave a dead link behind. Returns a copy so a
 * caller cannot mutate the registry.
 */
export function allServices(): ServiceEntry[] {
  return [...ENTRIES]
}
