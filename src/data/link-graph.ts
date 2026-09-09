import type { CityContent } from '../content/types'
import { cityKeyOf } from '../content/interpolate'
import { sitePaths } from './routes'
import { siteData } from './site'
import { areasData } from './areas'
import { packagesData } from './packages'
import { blogCardsFor } from './blog'
import { recentPostsFor } from './recent-posts'
import { posts, postSlugs, type Inline } from './posts'
import { postForCity } from './posts/tenant'
import { suburbData } from './suburb'
import { breadcrumbs, type BreadcrumbTarget } from './breadcrumbs'
import { SERVICE_SLUGS, serviceBySlug } from './services/registry'

// The internal link graph of one city, built from the same data the pages render. Used by check-links.
export type LinkGraph = {
  pages: string[]
  /** page -> the pages it links to (tenant-relative paths, self-links removed) */
  edges: Map<string, Set<string>>
  /** page -> breadcrumb depth (0 = none) */
  crumbs: Map<string, number>
  problems: string[]
}

const OWN_HOST = /(^|\.)ivycleans\.com$/i

export function linkGraph(c: CityContent): LinkGraph {
  const pages = sitePaths(c)
  const served = new Set(pages)
  const prefix = c.status === 'live' ? '' : `/${cityKeyOf(c)}`
  const edges = new Map<string, Set<string>>(pages.map((p) => [p, new Set<string>()]))
  const crumbs = new Map<string, number>(pages.map((p) => [p, 0]))
  const problems: string[] = []

  // an href as the tenant-relative path it points at, or null for an external/tel/mailto link
  const toPath = (from: string, href: string): string | null => {
    if (/^(tel:|mailto:|#)/i.test(href)) return null
    if (/^https?:\/\//i.test(href)) {
      const host = new URL(href).hostname
      if (OWN_HOST.test(host)) problems.push(`${from}: link leaves the tenant -> ${href}`)
      return null
    }
    if (href.startsWith('//')) {
      problems.push(`${from}: protocol-relative link -> ${href}`)
      return null
    }
    let path = href.split(/[?#]/)[0]
    if (prefix && (path === prefix || path.startsWith(`${prefix}/`))) path = path.slice(prefix.length) || '/'
    path = path.replace(/\/+$/, '') || '/'
    if (!served.has(path)) problems.push(`${from}: links to a page this city does not serve -> ${href}`)
    return path
  }

  const link = (from: string, href: string) => {
    const to = toPath(from, href)
    if (to !== null && to !== from) edges.get(from)?.add(to)
  }
  const crumb = (page: string, target: BreadcrumbTarget) => {
    const trail = breadcrumbs(c, target)
    crumbs.set(page, trail.length)
    for (const item of trail.slice(0, -1)) link(page, item.href)
  }

  const { site, innerSite } = siteData(c)
  const chrome = [
    ...site.nav.map((l) => l.href),
    ...site.serviceNav.map((l) => l.href),
    site.bookingUrl,
    innerSite.bookUrl,
    ...['/', '/blog', '/contact', '/faq', '/privacy-policy'].map((p) => `${prefix}${p}`.replace(/^\/\//, '/')),
  ]
  for (const page of pages) for (const href of chrome) link(page, href)

  // front page
  if (c.hasSuburbPages) for (const a of areasData(c).areas) link('/', a.href)
  for (const p of packagesData(c).packages) link('/', p.href)
  for (const card of recentPostsFor(c)) link('/', card.href)

  // /home
  if (c.hasSuburbPages) for (const a of areasData(c).areas) link('/home', a.href)
  link('/home', `${prefix}/services/deep-cleaning`)
  link('/home', `${prefix}/services/move-in-move-out-cleaning`)

  // static inner pages
  for (const [page, label] of [
    ['/blog', 'Blog'],
    ['/contact', 'Contact'],
    ['/faq', 'FAQ'],
    ['/book', 'Book Now'],
    ['/cleaning-services', 'Cleaning Services'],
    ['/privacy-policy', 'Privacy Policy'],
  ] as const) {
    crumb(page, { kind: 'page', label, path: page })
  }
  for (const card of blogCardsFor(c)) link('/blog', card.href)
  link('/faq', `${prefix}/contact`)

  // blog posts
  const runs = (from: string, list: Inline[]) => {
    for (const run of list) {
      if (typeof run === 'string') continue
      if ('b' in run) runs(from, run.b)
      else if ('i' in run) runs(from, run.i)
      else {
        link(from, run.href)
        runs(from, run.a)
      }
    }
  }
  for (const slug of postSlugs) {
    const page = `/${slug}`
    const post = postForCity(posts[slug], c)
    crumb(page, { kind: 'post', title: post.h1, slug })
    for (const block of post.blocks) {
      if (block.type === 'img') continue
      if ('items' in block) for (const item of block.items) runs(page, item)
      else runs(page, block.text)
    }
    if (post.authorBox.href) link(page, post.authorBox.href)
    for (const item of post.responses?.items ?? []) if (item.href) link(page, item.href)
  }

  // service pages
  for (const slug of SERVICE_SLUGS) {
    const page = `/services/${slug}`
    crumb(page, { kind: 'service', slug })
    if (c.hasSuburbPages) for (const a of areasData(c).areas) link(page, a.href)
    const entry = serviceBySlug(slug)
    if (entry?.kind === 'template') for (const l of entry.content(c).whatIs.localLinks ?? []) link(page, l.href)
  }

  // area pages
  if (c.hasSuburbPages) {
    for (const suburb of c.research.suburbs) {
      const page = `/${suburb.slug}`
      crumb(page, { kind: 'area', name: suburb.name, slug: suburb.slug })
      const data = suburbData(c, suburb)
      for (const l of [...data.hero.links, ...data.houseCleaning.links, ...data.benefits.links]) link(page, l.href)
      for (const l of data.nearby.links) link(page, l.href)
      for (const l of data.otherServices.links) link(page, l.href)
    }
  }

  return { pages, edges, crumbs, problems }
}

/** page -> the pages that link to it */
export function inbound(graph: LinkGraph): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>(graph.pages.map((p) => [p, new Set<string>()]))
  for (const [from, targets] of graph.edges) for (const to of targets) out.get(to)?.add(from)
  return out
}
