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

/**
 * The registry key a city document is stored under (content/<key>.json).
 * CityContent carries no explicit key field, so it is derived from the display
 * name — verified to match the filename for every shipped city
 * ("Minneapolis" -> minneapolis, "Testville" -> testville). A city whose name
 * does not slugify to its filename would break its preview links, so the
 * publish flow (Plan 3) must keep the two in step.
 */
export function cityKeyOf(c: Pick<CityContent, 'city'>): string {
  return citySlug(c.city)
}

/**
 * Rewrites an internal path for the city it is rendered for.
 *
 * A LIVE city is served from its own host, so its links stay public and this
 * is the identity function — that is what keeps Minneapolis byte-identical.
 * A DRAFT city has no host yet; it is previewed at its internal
 * `/<cityKey>/…` paths, so every internal link has to carry that prefix or
 * the preview escapes to the default tenant on the first click.
 *
 * External URLs, `tel:`/`mailto:` and asset paths must NOT go through here.
 */
export function cityHref(c: Pick<CityContent, 'city' | 'status'>, path: string): string {
  if (c.status === 'live') return path
  const key = cityKeyOf(c)
  // "/" is the city root itself — `/${key}/` would only redirect to `/${key}`.
  return path === '/' ? `/${key}` : `/${key}${path}`
}

/**
 * Fills {tokens} in template copy. Static copy with a city mention is stored
 * ONCE in src/data with tokens; this is the only mechanism that writes a
 * city name into it — a model never edits static copy.
 */
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
