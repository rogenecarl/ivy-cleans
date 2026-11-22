// host -> city rewrite as a pure function, no fs and no database (the proxy runs on every request): both
// indexes are inlined at build, and Global Config adds what was created since.
import domainsJson from "@content/_domains.json";
import cityKeys from "@content/_cities.json";

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
    const { getAll } = await import("@vercel/edge-config");
    const { hosts, cityKeys: keys } = await getAll<{
      hosts?: Record<string, string>;
      cityKeys?: string[];
    }>(["hosts", "cityKeys"]);
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
export function normalizeHost(host: string): string {
  return host.toLowerCase().split(":")[0];
}

// *.vercel.app serves the same pages as a city's real domain, so it must never be indexed
export function isPreviewHost(host: string): boolean {
  return normalizeHost(host).endsWith('.vercel.app')
}

const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

// what an operator typed or pasted ("https://Example.com/contact", "example.com:3000") -> bare host, or null
export function parseDomainInput(raw: string): string | null {
  const host = normalizeHost(raw.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split(/[/?#]/)[0]).replace(/\.$/, "");
  return HOSTNAME.test(host) ? host : null;
}

// the brand's own domain is also where the operator works: the console answers there, and so do draft previews for a
// signed-in operator. Every other city domain keeps both off.
const OPERATOR_HOSTS = ["ivycleans.com", "www.ivycleans.com"];

export function isOperatorHost(host: string): boolean {
  return OPERATOR_HOSTS.includes(normalizeHost(host));
}

/** Origins the sign-in form may post from: the brand domain and the vercel.app host. */
export const OPERATOR_ORIGINS = [...OPERATOR_HOSTS.map((h) => `https://${h}`), "https://ivycleans.vercel.app"];

// is this host a customer domain? proxy.ts uses it to keep the console off customer domains
export function isMappedHost(
  host: string,
  domains: DomainsIndex = domainsJson as DomainsIndex,
): boolean {
  return Boolean(domains.hosts[normalizeHost(host)]);
}

// paths never rewritten into a city tree: Next internals, assets, route handlers, anything with an extension
const INTERNAL = /^\/(_next|images|icons|favicon|icon|api)\b|\.\w+$/;

// internal pathname to rewrite to, or null: internal path -> null; mapped host -> /<city><path> (a city-key path is
// left alone when previewAllowed); default host -> /<default><path> unless the first segment is a city key or `admin`
export function resolveRewrite(
  host: string,
  pathname: string,
  domains: DomainsIndex = domainsJson as DomainsIndex,
  cities: string[] = cityKeys as string[],
  previewAllowed = false,
): string | null {
  if (INTERNAL.test(pathname)) return null;

  const mapped = domains.hosts[normalizeHost(host)];
  if (mapped && previewAllowed && cities.includes(pathname.split("/")[1])) return null;

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
