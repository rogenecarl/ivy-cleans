/*
 * Which city did this submission come from?
 *
 * Deliberately mirrors resolveRewrite()'s host normalization, because the
 * whole point is that a lead is attributed to the SAME city whose pages the
 * proxy just rendered. Divergence here would mean a customer filling in the
 * Miami site and landing in another city's list.
 *
 * `renderedCityKey` comes from the browser and is therefore untrusted. It is
 * read only when the host is not a tenant domain — which is precisely the
 * situation the proxy is already in when it passes /<cityKey>/... through
 * unchanged, so it is the only key available there.
 *
 * THIS FUNCTION NO LONGER DECIDES `isTest`, and that is the point.
 *
 * It used to answer two different questions with one flag: "did this arrive
 * on a mapped host" and "is this a draft preview". Those are not the same
 * question. content/_domains.json currently maps NO hosts at all, so a LIVE
 * city reachable at <deploy-host>/<cityKey>/contact — the normal state until
 * the domain map moves to Postgres — had every real customer stored as a test
 * row: never emailed, filtered out of the leads list, excluded from the Sites
 * counts, with no screen offering a way to see them. Real customers piled up
 * unanswered behind a "0 / 0".
 *
 * A submission is a test row only when THE CITY ITSELF IS A DRAFT
 * (CityContent.status !== 'live'). A live city's leads are real regardless of
 * how the request arrived. That lookup is I/O, so it lives behind the
 * `isDraftCity` port in submit.ts; this function stays pure.
 */
import type { DomainsIndex } from '../content/resolve-rewrite'

export type Attribution = {
  cityKey: string
  /**
   * true when the Host header itself identified the city (a mapped tenant
   * domain), i.e. the key is tamper-proof. false means the key came from the
   * untrusted `renderedCityKey`.
   *
   * Reported for diagnostics and to keep the two questions visibly separate.
   * It deliberately does NOT decide whether the lead is a test row.
   */
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
