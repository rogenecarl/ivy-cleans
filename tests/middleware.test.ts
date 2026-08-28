import { describe, expect, it } from 'vitest'
import { isMappedHost, resolveRewrite, type DomainsIndex } from '../src/content/resolve-rewrite'
import { resolveAdminRedirect } from '../src/content/resolve-admin'

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

  it('passes the admin console through on the default host', () => {
    // The console lives outside the (sites)/[city] tree; rewriting it into a
    // city would make it unreachable. The segment is now the plain, guessable
    // "admin" — sessions are the access control, not the URL.
    expect(resolveRewrite(DEFAULT_HOST, '/admin')).toBeNull()
    expect(resolveRewrite(DEFAULT_HOST, '/admin/dashboard')).toBeNull()
    expect(resolveRewrite(DEFAULT_HOST, '/admin/login')).toBeNull()
    expect(resolveRewrite(DEFAULT_HOST, '/admin/generate/miami')).toBeNull()
  })

  it('no longer passes through arbitrary /admin-* paths', () => {
    // The old rule was the `admin-` PREFIX, because the real segment was an
    // unguessable literal. With a fixed segment the prefix rule is dead
    // surface: /admin-anything is just a page path in the default tenant.
    expect(resolveRewrite(DEFAULT_HOST, '/admin-fake')).toBe('/minneapolis/admin-fake')
    expect(resolveRewrite(DEFAULT_HOST, '/admin-x7kq92mpfw4rt8vz')).toBe(
      '/minneapolis/admin-x7kq92mpfw4rt8vz',
    )
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
    // The /admin passthrough lives inside the default-host branch on purpose.
    // On a mapped tenant host the path still gets city-prefixed, so it lands
    // on a route that does not exist in the city tree and 404s — the console
    // is reachable on the operator's default host only. This is the second
    // layer; sessions are the first.
    expect(resolveRewrite('miamicleans.com', '/admin', domains, cities)).toBe('/miami/admin')
    expect(resolveRewrite('miamicleans.com', '/admin/login', domains, cities)).toBe(
      '/miami/admin/login',
    )
  })

  it('isMappedHost distinguishes a customer domain from everything else', () => {
    // src/proxy.ts gates its own admin branch on this — see resolve-admin
    // wiring in proxy.ts and the "regression" note on the proxy suite below.
    // Case-3 above is what happens once this predicate says "mapped".
    expect(isMappedHost('miamicleans.com', domains)).toBe(true)
    expect(isMappedHost('MiamiCleans.com', domains)).toBe(true)
    expect(isMappedHost('miamicleans.com:443', domains)).toBe(true)
    expect(isMappedHost('random.example', domains)).toBe(false)
    expect(isMappedHost('localhost:3100', domains)).toBe(false)
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

describe('resolveAdminRedirect', () => {
  it('leaves non-admin paths alone', () => {
    expect(resolveAdminRedirect('/home', null)).toBeNull()
    expect(resolveAdminRedirect('/minneapolis/contact', null)).toBeNull()
  })

  it('sends a signed-out visitor to login with where they were going', () => {
    expect(resolveAdminRedirect('/admin/leads', null)).toBe('/admin/login?next=%2Fadmin%2Fleads')
    expect(resolveAdminRedirect('/admin', null)).toBe('/admin/login?next=%2Fadmin')
  })

  it('never gates the login page itself', () => {
    // The redirect loop this whole route-group split exists to prevent.
    expect(resolveAdminRedirect('/admin/login', null)).toBeNull()
    expect(resolveAdminRedirect('/admin/login?next=%2Fadmin', null)).toBeNull()
  })

  it('does NOT bounce a signed-in operator off the login page', () => {
    // BLOCKER 1 of the final review: getSessionCookie is a presence check,
    // not a verification -- a stale cookie (post-revocation, or after a
    // BETTER_AUTH_SECRET rotation) makes `session` here look signed-in when
    // the server would refuse it. Bouncing on that guess turns /admin/login
    // and /admin/dashboard into a redirect loop with no way back to the one
    // page that could recover the operator. src/app/admin/login/page.tsx
    // does this bounce instead, from a server-verified session.
    expect(resolveAdminRedirect('/admin/login', { role: 'manager' })).toBeNull()
    expect(resolveAdminRedirect('/admin/login', { role: 'admin' })).toBeNull()
  })

  it('bounces a manager off an admin-only path', () => {
    expect(resolveAdminRedirect('/admin/sites', { role: 'manager' })).toBe('/admin/dashboard')
    expect(resolveAdminRedirect('/admin/new', { role: 'manager' })).toBe('/admin/dashboard')
  })

  it('lets a manager through to their own sections', () => {
    expect(resolveAdminRedirect('/admin/leads/abc', { role: 'manager' })).toBeNull()
    expect(resolveAdminRedirect('/admin/dashboard', { role: 'manager' })).toBeNull()
  })

  it('lets an admin through everywhere', () => {
    expect(resolveAdminRedirect('/admin/sites/miami', { role: 'admin' })).toBeNull()
  })

  it('passes an authenticated session with an unreadable role through', () => {
    // The cookie cache can be absent or stale — a cookie exists but the role
    // is not in it. Guessing "manager" here would bounce an admin off Sites
    // on a cold navigation. The page's own server-side guard is one hop away
    // and knows the truth, so pass it on rather than redirect on a guess.
    expect(resolveAdminRedirect('/admin/sites', { role: undefined })).toBeNull()
    expect(resolveAdminRedirect('/admin/sites', { role: 'nonsense' })).toBeNull()
  })

  it('never loops a stale-cookie visit to the login page back to itself', () => {
    // The exact shape of BLOCKER 1: `session` truthy (a cookie is present)
    // but its role unreadable is what a stale/unverifiable cookie looks like
    // to this optimistic layer. If this ever returned '/admin/dashboard'
    // again, and the dashboard's server-side guard then rejected the same
    // unverifiable cookie and redirected back to /admin/login, the pair
    // would loop forever with no page left that could break it.
    expect(resolveAdminRedirect('/admin/login', { role: undefined })).toBeNull()
  })
})
