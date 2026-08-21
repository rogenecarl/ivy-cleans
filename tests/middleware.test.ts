import { describe, expect, it } from 'vitest'
import { resolveRewrite, type DomainsIndex } from '../src/content/resolve-rewrite'

/*
 * Pure tests over the proxy's rewrite decision (src/proxy.ts is a thin
 * adapter around resolveRewrite, so everything worth asserting lives here).
 * Named middleware.test.ts per the plan; Next 16 renamed the *file
 * convention* middleware -> proxy, the routing behaviour is unchanged.
 */

// The shipped defaults: default host is minneapolis, no mapped hosts yet.
const DEFAULT_HOST = 'localhost:3100'

describe('resolveRewrite — default host (no _domains.hosts entry)', () => {
  it('sends the bare root to the default city', () => {
    expect(resolveRewrite(DEFAULT_HOST, '/')).toBe('/minneapolis')
  })

  it('prefixes a public path with the default city', () => {
    expect(resolveRewrite(DEFAULT_HOST, '/home')).toBe('/minneapolis/home')
    expect(resolveRewrite(DEFAULT_HOST, '/deep-cleaning-minneapolis')).toBe(
      '/minneapolis/deep-cleaning-minneapolis',
    )
  })

  it('passes an already-internal /<cityKey>/... preview path through untouched', () => {
    expect(resolveRewrite(DEFAULT_HOST, '/minneapolis/home')).toBeNull()
    expect(resolveRewrite(DEFAULT_HOST, '/minneapolis')).toBeNull()
  })

  it('passes a DRAFT city preview path through too, once it is in _cities.json', () => {
    // Task 5 added "testville" to content/_cities.json; that entry is the only
    // thing that turns /testville/... from "a public page path" into "this
    // draft city's preview tree" — the whole contract of the hand-maintained
    // index. Draft cities are never in _domains.hosts, so this branch is the
    // ONLY way their preview is reachable.
    expect(resolveRewrite(DEFAULT_HOST, '/testville')).toBeNull()
    expect(resolveRewrite(DEFAULT_HOST, '/testville/home')).toBeNull()
    expect(resolveRewrite(DEFAULT_HOST, '/testville/deep-cleaning-testville')).toBeNull()
  })

  it('passes the admin console through — and any /admin-* path', () => {
    // The admin route folder is a literal, unguessable segment outside the
    // (sites)/[city] tree; rewriting it into a city would make it unreachable.
    expect(resolveRewrite(DEFAULT_HOST, '/admin-x7kq92mpfw4rt8vz')).toBeNull()
    expect(resolveRewrite(DEFAULT_HOST, '/admin-x7kq92mpfw4rt8vz/new')).toBeNull()
    expect(resolveRewrite(DEFAULT_HOST, '/admin-x7kq92mpfw4rt8vz/generate/miami')).toBeNull()
    // The rule is the `admin-` PREFIX, not the exact segment: an unknown one
    // passes through and 404s on its own, which beats 404ing inside a tenant.
    expect(resolveRewrite(DEFAULT_HOST, '/admin-fake')).toBeNull()
  })

  it('ignores the port and the host casing', () => {
    expect(resolveRewrite('LOCALHOST:3100', '/home')).toBe('/minneapolis/home')
    expect(resolveRewrite('Example.COM', '/home')).toBe('/minneapolis/home')
  })

  it('rewrites an unknown first segment — it is a page path, not a city', () => {
    // The counterpart to the passthrough above: a first segment that is NOT in
    // content/_cities.json is just a page path and still gets city-prefixed,
    // so a 404 surfaces inside the default tenant rather than as a bogus city.
    expect(resolveRewrite(DEFAULT_HOST, '/nocity/x')).toBe('/minneapolis/nocity/x')
    expect(resolveRewrite(DEFAULT_HOST, '/privacy-policy')).toBe('/minneapolis/privacy-policy')
  })
})

describe('resolveRewrite — mapped host', () => {
  const domains: DomainsIndex = {
    default: 'minneapolis',
    hosts: { 'miamicleans.com': 'miami' },
  }
  const cities = ['minneapolis', 'miami']

  it('rewrites the tenant host into its own city tree', () => {
    expect(resolveRewrite('miamicleans.com', '/deep-cleaning-miami', domains, cities)).toBe(
      '/miami/deep-cleaning-miami',
    )
    expect(resolveRewrite('miamicleans.com', '/', domains, cities)).toBe('/miami')
  })

  it('still maps the tenant host when it arrives with a port', () => {
    expect(resolveRewrite('miamicleans.com:443', '/home', domains, cities)).toBe('/miami/home')
  })

  it('falls back to the default city for an unmapped host', () => {
    expect(resolveRewrite('random.example', '/home', domains, cities)).toBe('/minneapolis/home')
  })

  it('does NOT expose the admin on a customer domain', () => {
    // The /admin-* passthrough lives inside the default-host branch on
    // purpose. On a mapped tenant host the path still gets city-prefixed, so
    // it lands on a route that does not exist in the city tree and 404s —
    // the admin is reachable on the operator's default host only.
    expect(resolveRewrite('miamicleans.com', '/admin-x7kq92mpfw4rt8vz', domains, cities)).toBe(
      '/miami/admin-x7kq92mpfw4rt8vz',
    )
    expect(resolveRewrite('miamicleans.com', '/admin-x7kq92mpfw4rt8vz/new', domains, cities)).toBe(
      '/miami/admin-x7kq92mpfw4rt8vz/new',
    )
  })
})

describe('resolveRewrite — internal and static paths pass through', () => {
  it.each([
    '/_next/static/x.js',
    '/_next/image',
    '/images/a.jpg',
    '/icons/logo.svg',
    '/api/anything',
    '/favicon.ico',
    '/icon.png',
    '/robots.txt',
    '/sitemap.xml',
  ])('%s -> null', (pathname) => {
    expect(resolveRewrite(DEFAULT_HOST, pathname)).toBeNull()
  })
})
