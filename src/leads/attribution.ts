// Which city a submission came from. Mirrors resolveRewrite()'s host normalisation. `renderedCityKey` is untrusted
// and read only when the host is not a tenant domain. Whether it is a test row is a separate question (submit.ts):
// only a DRAFT city's leads are tests — a live city's are real however the request arrived.
import type { DomainsIndex } from '../content/resolve-rewrite'

export type Attribution = {
  cityKey: string
  // true when the Host header identified the city (tamper-proof); diagnostics only
  hostMapped: boolean
}

export function attributeCity(
  host: string,
  renderedCityKey: string,
  domains: DomainsIndex,
): Attribution {
  const normalized = host.toLowerCase().split(':')[0]
  const mapped = domains.hosts[normalized]
  // A mapped host always wins: it cannot be forged by the browser, so
  // attribution for a real tenant domain never consults the client at all.
  if (mapped) return { cityKey: mapped, hostMapped: true }
  return { cityKey: renderedCityKey, hostMapped: false }
}
