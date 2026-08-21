/*
 * Which city did this submission come from?
 *
 * Deliberately mirrors resolveRewrite()'s host normalization, because the
 * whole point is that a lead is attributed to the SAME city whose pages the
 * proxy just rendered. Divergence here would mean a customer filling in the
 * Miami site and landing in another city's list.
 *
 * `renderedCityKey` comes from the browser and is therefore untrusted. It is
 * read only when the host is not a tenant domain, where the worst outcome is a
 * test row with the wrong label. Every real lead is attributed from the Host
 * header alone.
 */
import type { DomainsIndex } from '../content/resolve-rewrite'

export type Attribution = {
  cityKey: string
  /** true = a draft preview submission: stored, hidden by default, never emailed. */
  isTest: boolean
}

export function attributeCity(
  host: string,
  renderedCityKey: string,
  domains: DomainsIndex,
): Attribution {
  const normalized = host.toLowerCase().split(':')[0]
  const mapped = domains.hosts[normalized]
  if (mapped) return { cityKey: mapped, isTest: false }
  if (renderedCityKey === domains.default) {
    return { cityKey: domains.default, isTest: false }
  }
  return { cityKey: renderedCityKey, isTest: true }
}
