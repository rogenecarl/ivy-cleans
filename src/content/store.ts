// src/content/store.ts
/*
 * The city registry. Plan 2a: static, file-backed, single live city.
 * Plan 2b: async, per-process-cached, Blob-or-file-backed, with a
 * host -> cityKey index (_domains.json). The SEAM is now honest — this
 * module resolves ANY city key async; per-request resolution (reading the
 * key from the URL) arrives in Task 4 via [city] route params, not by
 * editing these call sites again.
 */
import { readFile, readdir } from 'fs/promises'
import path from 'path'
import type { CityContent } from './types'
import type { TokenSource } from './interpolate'
import { citySlug } from './interpolate'
import { validateCityContent } from './validate'
import domainsJson from '../../content/_domains.json'

export type DomainsIndex = {
  default: string
  hosts: Record<string, string>
}

const defaultDomains: DomainsIndex = domainsJson as DomainsIndex

const CONTENT_DIR = path.join(process.cwd(), 'content')
const KEY_PATTERN = /^[a-z0-9-]+$/

/** Per-process cache: city key -> validated doc. */
const cache = new Map<string, CityContent>()

async function loadCityDoc(key: string): Promise<CityContent> {
  let raw: string
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Blob-backed: fetch content/<key>.json from Vercel Blob.
    const { head } = await import('@vercel/blob')
    const pathname = `content/${key}.json`
    let blob
    try {
      blob = await head(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN })
    } catch {
      throw new Error(`unknown city "${key}"`)
    }
    const res = await fetch(blob.url)
    if (!res.ok) throw new Error(`unknown city "${key}"`)
    raw = await res.text()
  } else {
    // Local file, dev/build fallback.
    const filePath = path.join(CONTENT_DIR, `${key}.json`)
    try {
      raw = await readFile(filePath, 'utf-8')
    } catch {
      throw new Error(`unknown city "${key}"`)
    }
  }
  const parsed: unknown = JSON.parse(raw)
  return assertKeyMatchesCity(key, validateCityContent(parsed))
}

/**
 * CityContent carries no explicit registry key, so `cityHref`/`cityKeyOf`
 * derive a draft city's preview prefix from `citySlug(doc.city)`. If that ever
 * disagreed with the key the document is stored under, every preview link
 * would point at a city that does not exist. Checked once, at load, with the
 * key still in hand — a mismatched document fails that city only.
 */
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

/**
 * Pure function: host -> cityKey. Lowercases, strips a port, exact-matches
 * against `domains.hosts`, else falls back to `domains.default`. No fs —
 * safe to call from middleware.
 */
export function resolveCityKey(host: string, domains: DomainsIndex = defaultDomains): string {
  const normalized = host.toLowerCase().split(':')[0]
  return domains.hosts[normalized] ?? domains.default
}

/** Live city keys, for generateStaticParams. Local-file mode reads content/; Blob mode variant below. */
export async function listLiveCityKeys(): Promise<string[]> {
  let keys: string[]
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Blob-backed branch: list blobs under content/, same key filter as below.
    const { list } = await import('@vercel/blob')
    const { blobs } = await list({ prefix: 'content/', token: process.env.BLOB_READ_WRITE_TOKEN })
    keys = blobs
      .map((b) => path.basename(b.pathname))
      .filter((name) => name.endsWith('.json') && !name.startsWith('_'))
      .map((name) => name.slice(0, -'.json'.length))
  } else {
    // withFileTypes so a directory (e.g. content/_drafts/, holding the
    // admin pipeline's in-progress sidecars) can never be mistaken for a
    // city document — only regular files are eligible before the .json/`_`
    // filters even run.
    const entries = await readdir(CONTENT_DIR, { withFileTypes: true })
    keys = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('_'))
      .map((entry) => entry.name.slice(0, -'.json'.length))
  }

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
