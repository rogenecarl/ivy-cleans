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
 *     (/testville/home) and must not be double-prefixed, or starts with
 *     `admin-`, which is the operator console living outside the city tree.
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

  const normalizedHost = host.toLowerCase().split(":")[0];
  const mapped = domains.hosts[normalizedHost];

  if (!mapped) {
    const first = pathname.split("/")[1];
    /*
     * The admin lives OUTSIDE the (sites)/[city] tree at
     * /admin-x7kq92mpfw4rt8vz (an unguessable literal folder name), so it must
     * reach its own route rather than be rewritten into a city. The rule is
     * the prefix, not the exact segment: an unknown `/admin-*` path passes
     * through and 404s naturally, which is strictly better than prefixing it
     * into a tenant and 404ing there.
     *
     * WHY THIS SITS INSIDE THE `!mapped` (default-host) BRANCH, deliberately:
     * a MAPPED production host is a customer's own domain, and the admin must
     * not be reachable on it. Left in this branch, a request for
     * miamicleans.com/admin-x7kq92mpfw4rt8vz still takes the rewrite below and
     * becomes /miami/admin-x7kq92mpfw4rt8vz — which matches no route in the
     * city tree ([serviceSlug] only accepts the two computed service slugs)
     * and 404s. Hoisting this check above the host lookup would have opened
     * the admin on every customer domain.
     *
     * The reach of that guarantee, stated precisely: hosts listed in
     * _domains.hosts deny the admin by construction. Every OTHER host takes
     * this branch and DOES reach it — the raw *.vercel.app deploy URL, any
     * unrecognized Host header, and a customer domain that has been attached
     * in Vercel but not yet registered here by publish. This is not
     * authentication and was never meant to be: on the default branch the
     * unguessable path is the actual access control, and adding real auth is
     * the fix if that ever stops being enough.
     */
    if (first && first.startsWith("admin-")) return null;
    if (first && cities.includes(first)) return null;
  }

  const cityKey = mapped ?? domains.default;
  return `/${cityKey}${pathname === "/" ? "" : pathname}`;
}
