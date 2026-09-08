import type { CityContent } from '../content/types'
import { cityHref } from '../content/interpolate'
import { serviceBySlug, type ServiceSlug } from './services/registry'

/*
 * Breadcrumb trails — one array, two outputs.
 *
 * Abdi's Orlando review, item 15A. Every inner page was reachable from the
 * header and footer and from almost nothing else: an area page had one
 * inbound link (the front page's list), a service page had none from any
 * area, and no page said what its parent was. Google associates pages with a
 * business by following links between pages that share names, and a site
 * whose pages are only reachable from the nav is a list, not a graph. A
 * breadcrumb is the one structural link every inner page can carry, and it
 * is the only piece of item 15 that needs no prompt work.
 *
 * The trail built here is rendered TWICE by Breadcrumbs.tsx — as the visible
 * nav and as BreadcrumbList JSON-LD — from this one array, so the two can
 * never disagree. Every href goes through cityHref(), so a draft city's
 * crumbs stay inside its /<key>/… preview and a live city's are bare.
 *
 * The shapes, per Abdi's spec:
 *   Home › Services › Deep Cleaning         (service pages)
 *   Home › Service Areas › Lake Mary        (area pages)
 *   Home › Blog › {post title}              (posts)
 *   Home › Contact / FAQ / Book Now / …     (everything else)
 *
 * /home gets NO trail. It is the clone's second homepage — its nav label is
 * "Home" — and "Home › Home" tells a reader and a crawler nothing.
 */
export type Crumb = { label: string; href: string }

export type BreadcrumbTarget =
  | { kind: 'page'; label: string; path: string }
  | { kind: 'service'; slug: ServiceSlug }
  | { kind: 'area'; name: string; slug: string }
  | { kind: 'post'; title: string; slug: string }

/*
 * "Service Areas" has no index page of its own: the full list lives in the
 * front page's Areas We Serve section, so the crumb points at that section
 * by fragment (ServiceArea renders `id="areas"` on the front page only).
 * "Services" is /cleaning-services, the page the nav calls Cleaning Services.
 */
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

/**
 * The BreadcrumbList node for a trail. Exported on its own so a test can pin
 * the shape without parsing rendered HTML.
 *
 * `item` is the same path the anchor uses — relative, resolved by the
 * consumer against the page's own URL. An absolute URL would need this
 * tenant's host at render time, and a live city's host is not knowable here
 * (content/_domains.json is empty until a domain is provisioned, and the
 * page is prerendered). When the LocalBusiness node (item 16) needs an
 * absolute `@id`, the origin helper it introduces should feed this too.
 */
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
