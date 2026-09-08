import type { CityContent } from './types'

export type TokenSource = Pick<
  CityContent,
  'city' | 'state' | 'phone' | 'phoneHref' | 'stateName' | 'phoneDisplay'
>

export function citySlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// registry key (content/<key>.json), derived from the display name
export function cityKeyOf(c: Pick<CityContent, 'city'>): string {
  return citySlug(c.city)
}

// internal path for this city: identity for a live city, /<key>-prefixed for a draft preview.
// Not for external URLs, tel:/mailto: or assets.
export function cityHref(c: Pick<CityContent, 'city' | 'status'>, path: string): string {
  if (c.status === 'live') return path
  const key = cityKeyOf(c)
  // "/" is the city root itself — `/${key}/` would only redirect to `/${key}`.
  return path === '/' ? `/${key}` : `/${key}${path}`
}

// fills {tokens} in template copy; the only thing that writes a city name into static copy
export function t(template: string, c: TokenSource): string {
  const tokens: Record<string, string> = {
    city: c.city,
    state: c.state,
    cityLower: c.city.toLowerCase(),
    stateLower: c.state.toLowerCase(),
    citySlug: citySlug(c.city),
    phone: c.phone,
    phoneHref: c.phoneHref,
    stateName: c.stateName,
    phoneDisplay: c.phoneDisplay,
  }
  const result = template.replace(/\{([^{}]*)\}/g, (_, name: string) => {
    const value = tokens[name]
    if (value === undefined) throw new Error(`unknown token {${name}} in template: ${template}`)
    return value
  })
  if (/[{}]/.test(result)) {
    throw new Error(`malformed braces in template: ${template}`)
  }
  return result
}

// a real street address, or undefined for the finalizeDraft placeholder (exact suffix match)
export function realAddress(address: string | undefined): string | undefined {
  if (address === undefined) return undefined
  return / — address pending$/.test(address) ? undefined : address
}
