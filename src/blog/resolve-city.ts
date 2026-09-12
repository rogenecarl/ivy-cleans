import type { DomainsIndex } from '@/content/resolve-rewrite'

// the brand's own domain is the default city even before it is mapped: that site is live on it today
const BRAND_HOSTS = new Set(['ivycleans.com', 'www.ivycleans.com'])

export function normalizeDomain(raw: string): string {
  let host = raw.trim().toLowerCase()
  host = host.replace(/^https?:\/\//, '').split('/')[0].split(':')[0]
  return host.replace(/^www\./, '')
}

/** The city a blog-tool website belongs to, by its configured domain; null when the domain is mapped to nothing. */
export function cityKeyForDomain(domain: string, domains: DomainsIndex): string | null {
  const host = normalizeDomain(domain)
  if (host === '') return null
  const mapped = domains.hosts[host] ?? domains.hosts[`www.${host}`]
  if (mapped) return mapped
  if (BRAND_HOSTS.has(host)) return domains.default
  return null
}

/** The first mapped host for a city, or null when the city has no domain yet. */
export function domainForCity(cityKey: string, domains: DomainsIndex): string | null {
  for (const [host, key] of Object.entries(domains.hosts)) if (key === cityKey) return host
  return null
}
