import type { CityContent } from '../content/types'
import { cityHref } from '../content/interpolate'
import { serviceBySlug, type ServiceSlug } from './services/registry'

// One trail per page kind, rendered by Breadcrumbs.tsx as both the nav and BreadcrumbList JSON-LD.
// Home › Services › {service} | Home › Service Areas › {area} | Home › Blog › {post} | Home › {page}. /home gets none.
export type Crumb = { label: string; href: string }

export type BreadcrumbTarget =
  | { kind: 'page'; label: string; path: string }
  | { kind: 'service'; slug: ServiceSlug }
  | { kind: 'area'; name: string; slug: string }
  | { kind: 'post'; title: string; slug: string }

// no areas index page: the crumb points at the front page's list by fragment
export const AREAS_PATH = '/#areas'
export const SERVICES_PATH = '/cleaning-services'

export function breadcrumbs(
  c: Pick<CityContent, 'city' | 'status'>,
  target: BreadcrumbTarget,
): Crumb[] {
  const home: Crumb = { label: 'Home', href: cityHref(c, '/') }
  switch (target.kind) {
    case 'page':
      return [home, { label: target.label, href: cityHref(c, target.path) }]
    case 'service': {
      const entry = serviceBySlug(target.slug)
      return [
        home,
        { label: 'Services', href: cityHref(c, SERVICES_PATH) },
        { label: entry?.name ?? target.slug, href: cityHref(c, `/services/${target.slug}`) },
      ]
    }
    case 'area':
      return [
        home,
        { label: 'Service Areas', href: cityHref(c, AREAS_PATH) },
        { label: target.name, href: cityHref(c, `/${target.slug}`) },
      ]
    case 'post':
      return [
        home,
        { label: 'Blog', href: cityHref(c, '/blog') },
        { label: target.title, href: cityHref(c, `/${target.slug}`) },
      ]
  }
}

/** BreadcrumbList for a trail. `item` is relative: a live city's host isn't knowable at prerender. */
export function breadcrumbListJsonLd(trail: Crumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.label,
      item: crumb.href,
    })),
  }
}
