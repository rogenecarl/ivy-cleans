// src/server/content/store.ts
// The city registry: async, cached per process on local files, with a host -> key index
import type { CityContent } from './types'
import type { TokenSource } from './interpolate'
import { citySlug } from './interpolate'
import { validateCityContent } from './validate'
import domainsJson from '@content/_domains.json'
import { normalizeHost, type DomainsIndex } from './resolve-rewrite'
import { CONTENT_DIR, listEntryKeys, listFileKeys, readEntry, readFileEntry, usesDatabase, writeEntry } from './entries'

export type { DomainsIndex }

const defaultDomains: DomainsIndex = domainsJson as DomainsIndex

export { CONTENT_DIR }
export const KEY_PATTERN = /^[a-z0-9-]+$/

/** Per-process cache: city key -> validated doc. Files only: with the database another server may have changed it. */
const cache = new Map<string, CityContent>()

async function loadCityDoc(key: string): Promise<CityContent> {
  let data: unknown
  try {
    data = await readEntry('city', key)
  } catch (err) {
    // a Neon outage must not take a customer's site down; the deployed file may be older, but it renders
    console.error(`content: database read of "${key}" failed, serving the deployed file:`, err)
    data = await readFileEntry('city', key)
  }
  if (data === null) throw new Error(`unknown city "${key}"`)
  return assertKeyMatchesCity(key, validateCityContent(data))
}

// citySlug(doc.city) must match the stored key or every preview link breaks; checked at load
export function assertKeyMatchesCity(key: string, doc: CityContent): CityContent {
  const slug = citySlug(doc.city)
  if (slug !== key) {
    throw new Error(
      `city document '${key}': city name '${doc.city}' slugifies to '${slug}', ` +
        `which must equal the registry key — preview links would 404`,
    )
  }
  return doc
}

/** Resolves a validated CityContent doc for `key`, cached per-process. */
export async function getCity(key: string): Promise<CityContent> {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`unknown city "${key}"`)
  }
  if (usesDatabase()) return loadCityDoc(key)
  const cached = cache.get(key)
  if (cached) return cached

  const doc = await loadCityDoc(key)
  cache.set(key, doc)
  return doc
}

/** Drops the cached doc for `key` so the next getCity() reloads it (Plan 3 admin). */
export function revalidateCity(key: string): void {
  cache.delete(key)
}

/** Plan 2b: still resolves the site-wide default (domains.default); Task 4 threads per-request keys. */
export async function getDefaultCity(): Promise<CityContent> {
  return getCity(defaultDomains.default)
}

// host -> cityKey, no fs
export function resolveCityKey(host: string, domains: DomainsIndex = defaultDomains): string {
  return domains.hosts[normalizeHost(host)] ?? domains.default
}

/** Live city keys, for generateStaticParams and the duplication check. */
export async function listLiveCityKeys(): Promise<string[]> {
  const keys = await listEntryKeys('city').catch(() => listFileKeys('city'))
  const docs = await Promise.all(keys.map((key) => getCity(key)))
  return keys.filter((_, i) => docs[i].status === 'live')
}

/** The token subset components need for t() templates. */
export function cityBits(c: CityContent): TokenSource {
  return {
    city: c.city,
    state: c.state,
    phone: c.phone,
    phoneHref: c.phoneHref,
    stateName: c.stateName,
    phoneDisplay: c.phoneDisplay,
  }
}

/** The stored document (no cache), or null when absent or invalid; a storage failure throws. For writers that must read fresh. */
export async function readCityDoc(key: string): Promise<CityContent | null> {
  const data = await readEntry('city', key)
  if (data === null) return null
  try {
    return validateCityContent(data)
  } catch {
    return null
  }
}

// validated before it is stored; the caller revalidates
export async function writeCityDoc(key: string, doc: CityContent): Promise<void> {
  await writeEntry('city', key, validateCityContent(doc))
}
