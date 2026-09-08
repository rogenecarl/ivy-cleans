// host -> city rewrite as a pure function, no fs: both indexes are inlined at build. _cities.json is hand-maintained
// and must list every key, drafts included, or the draft loses its preview path.
import domainsJson from "../../content/_domains.json";
import cityKeys from "../../content/_cities.json";

export type DomainsIndex = { default: string; hosts: Record<string, string> };

// Routing tables: Global Config merged over the deployed JSON so a new domain routes without a redeploy.
// Never throws — a throw here is the whole site down. The store is consulted only when EDGE_CONFIG is set.
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

// bare lowercase hostname, the key into _domains.hosts
function normalizeHost(host: string): string {
  return host.toLowerCase().split(":")[0];
}

// is this host a customer domain? proxy.ts uses it to keep the console off customer domains
export function isMappedHost(
  host: string,
  domains: DomainsIndex = domainsJson as DomainsIndex,
): boolean {
  return Boolean(domains.hosts[normalizeHost(host)]);
}

// paths never rewritten into a city tree: Next internals, assets, route handlers, anything with an extension
const INTERNAL = /^\/(_next|images|icons|favicon|icon|api)\b|\.\w+$/;

// internal pathname to rewrite to, or null: internal path -> null; mapped host -> /<city><path>;
// default host -> /<default><path> unless the first segment is a city key (preview) or `admin`
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
    // /admin lives outside the city tree. This check stays INSIDE the default-host branch on purpose: on a mapped
    // customer domain /admin is rewritten into the city tree and 404s, keeping the console off customer domains.
    // The auth API under /api is excluded by the proxy matcher and guarded by better-auth itself.
    if (first === "admin") return null;
    if (first && cities.includes(first)) return null;
  }

  const cityKey = mapped ?? domains.default;
  return `/${cityKey}${pathname === "/" ? "" : pathname}`;
}
