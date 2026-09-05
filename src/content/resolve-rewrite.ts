/*
 * The host -> city rewrite decision, as a pure function.
 *
 * Lives outside proxy.ts so it is testable in plain node and so proxy.ts
 * stays a thin adapter. It must never touch fs: Proxy runs before routes are
 * rendered and is meant to be deployable to a CDN edge, so BOTH indexes it
 * reads (_domains.json, _cities.json) are statically imported and inlined at
 * build time.
 *
 * That constraint is the whole reason `content/_cities.json` exists: the
 * store can list cities off disk (or Blob), but this function cannot, so the
 * key list is mirrored into a tiny JSON array that is HAND-MAINTAINED and
 * must contain EVERY known city key, draft ones included — a draft city
 * missing from it loses its preview path (see the case-3 note below).
 * Publishing a city means writing content/<key>.json, adding the key here,
 * and adding its host to _domains.json.
 */
import domainsJson from "../../content/_domains.json";
import cityKeys from "../../content/_cities.json";

export type DomainsIndex = { default: string; hosts: Record<string, string> };

/**
 * The routing tables, Global Config first and the deployed JSON second.
 *
 * WHY THIS EXISTS (task 9): both indexes above are inlined at build time, so
 * mapping a new domain in the admin does nothing until the app is redeployed.
 * That single import is the ONLY thing in the whole pipeline that forces a
 * rebuild — city content is already Blob-backed. Moving the host map into
 * Vercel Global Config, which is readable from the proxy at the edge, is what
 * makes a new site live the moment publishCity returns.
 *
 * MERGED, NEVER REPLACED. Minneapolis keeps routing from the deployed JSON
 * while every new city routes from Global Config, so turning this on changes
 * nothing that already works.
 *
 * NEVER THROWS. This runs on every request for every host: a routing read
 * that throws is the whole site, on every domain. A Global Config outage — or
 * an environment where it was never configured, which is every deployment
 * today — degrades to the last deployed map, never to nothing.
 *
 * The store is only consulted when EDGE_CONFIG is set (Vercel sets it when
 * you connect the store to the project), so an unconfigured deployment pays
 * nothing at all for this: no import, no request, no timeout.
 */
export async function loadRouting(): Promise<{ domains: DomainsIndex; cityKeys: string[] }> {
  const fallback = {
    domains: domainsJson as DomainsIndex,
    cityKeys: cityKeys as string[],
  };

  if (!process.env.EDGE_CONFIG) return fallback;

  try {
    // Imported lazily so a deployment without the store never loads the
    // client, and so a missing package degrades like any other failure.
    const { get } = await import("@vercel/edge-config");
    const [hosts, keys] = await Promise.all([
      get<Record<string, string>>("hosts"),
      get<string[]>("cityKeys"),
    ]);
    return {
      domains: {
        default: fallback.domains.default,
        hosts: { ...fallback.domains.hosts, ...(hosts ?? {}) },
      },
      cityKeys: [...new Set([...fallback.cityKeys, ...(keys ?? [])])],
    };
  } catch {
    return fallback;
  }
}

/**
 * Strips a port and case-folds a `Host` header down to the bare hostname
 * used as the key into `_domains.hosts` everywhere in this file.
 *
 * Extracted rather than left as two copies of `toLowerCase().split(':')[0]`
 * in `resolveRewrite` and `isMappedHost`: the Task 11 regression was a
 * host-scoping gap, and two independently-editable copies of this expression
 * is exactly how that class of bug comes back (an IPv6-bracket fix or a
 * different case-fold applied to one and not the other).
 */
function normalizeHost(host: string): string {
  return host.toLowerCase().split(":")[0];
}

/**
 * Is this host one of the customer domains in _domains.hosts?
 *
 * Exported for src/proxy.ts, which must apply the same host scoping to the
 * console branch that case 3 below applies to the rewrite — see the comment
 * on that branch for why the console must not appear on a customer domain.
 */
export function isMappedHost(
  host: string,
  domains: DomainsIndex = domainsJson as DomainsIndex,
): boolean {
  return Boolean(domains.hosts[normalizeHost(host)]);
}

/*
 * Paths that must never be rewritten into a city tree: Next internals, the
 * public/ asset folders, route handlers, and anything with a file extension
 * (…/x.js, /favicon.ico, /sitemap.xml). The proxy `matcher` already excludes
 * most of these, but the predicate is repeated here so the pure function is
 * correct on its own and testable without a matcher.
 */
const INTERNAL = /^\/(_next|images|icons|favicon|icon|api)\b|\.\w+$/;

/**
 * Returns the internal pathname to rewrite to, or `null` to pass the request
 * through untouched.
 *
 * Three cases:
 *  1. internal/static path            -> null
 *  2. host mapped in _domains.hosts   -> /<mappedCity><path>   (that tenant)
 *  3. otherwise (default host)        -> /<default><path>, UNLESS the first
 *     segment is already a known city key, which is the internal preview URL
 *     (/testville/home) and must not be double-prefixed, or is exactly
 *     `admin`, which is the operator console living outside the city tree.
 *
 * Case 3's guard is why `cities` is needed at all: without it the preview
 * paths would become /minneapolis/testville/home and 404.
 */
export function resolveRewrite(
  host: string,
  pathname: string,
  domains: DomainsIndex = domainsJson as DomainsIndex,
  cities: string[] = cityKeys as string[],
): string | null {
  if (INTERNAL.test(pathname)) return null;

  const mapped = domains.hosts[normalizeHost(host)];

  if (!mapped) {
    const first = pathname.split("/")[1];
    /*
     * The admin lives OUTSIDE the (sites)/[city] tree at /admin, so it must
     * reach its own route rather than be rewritten into a city.
     *
     * WHY THIS SITS INSIDE THE `!mapped` (default-host) BRANCH, deliberately:
     * a MAPPED production host is a customer's own domain, and the admin must
     * not be reachable on it. Left in this branch, a request for
     * miamicleans.com/admin still takes the rewrite below and becomes
     * /miami/admin — which matches no route in the city tree ([serviceSlug]
     * only accepts the two computed service slugs) and 404s. Hoisting this
     * check above the host lookup would have opened the admin on every
     * customer domain.
     *
     * The reach of that guarantee, stated precisely: hosts listed in
     * _domains.hosts deny the console by construction. Every OTHER host takes
     * this branch and DOES reach it — the raw *.vercel.app deploy URL, any
     * unrecognized Host header, and a customer domain attached in Vercel but
     * not yet registered here by publish.
     *
     * That reach is only acceptable once the console requires a session.
     *
     * Once that guard is in place, reaching this path only ever gets you a
     * login form, and this host rule becomes the SECOND layer: it keeps the
     * console UI, and the fact that a /admin PAGE exists, off customer-
     * branded domains. It does not hide the auth API: the proxy's own
     * matcher below excludes /api, so GET https://<customer-domain>/api/
     * auth/... still reaches the route handler regardless of this rule —
     * that surface is guarded by better-auth's own logic, not by this file.
     * Either way, do not hoist this check above the host lookup — that would
     * put the console PAGE on every customer's domain.
     */
    if (first === "admin") return null;
    if (first && cities.includes(first)) return null;
  }

  const cityKey = mapped ?? domains.default;
  return `/${cityKey}${pathname === "/" ? "" : pathname}`;
}
