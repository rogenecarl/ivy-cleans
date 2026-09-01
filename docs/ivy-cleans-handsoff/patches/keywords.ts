// src/pipeline/keywords.ts
/*
 * DataForSEO keyword data.
 *
 * WHY THIS EXISTS. buildResearchPrompt used to ask the model, as part (d), for
 * "the search phrases people in this area actually type when they are looking
 * to hire a cleaner." A language model cannot know that. It produces plausible
 * phrases, and every downstream prompt is then steered by a guess — the front
 * page, the deep-cleaning page and the area pages all receive that list as
 * their statement of what the city is searching for.
 *
 * This module replaces the guess with measured volume.
 *
 * SHAPED LIKE ModelClient ON PURPOSE. Same seam as src/pipeline/model.ts: an
 * interface, a real implementation, and a stub, so stages.ts stays testable
 * and `STUB_MODEL=1` keeps the whole pipeline runnable with no network and no
 * spend.
 *
 * NOT .strict(). Everywhere else in this codebase a zod schema is strict,
 * because an unexpected key from the MODEL means it went off-script. This
 * parses a third-party API instead: DataForSEO adds fields over time, and a
 * new one appearing must not break a city build. Pick out what is needed,
 * ignore the rest.
 */

import { z } from 'zod'

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */

export interface KeywordMetric {
  keyword: string
  /** Average monthly searches. 0 is a real answer, null means Google had no data. */
  searchVolume: number | null
  cpc: number | null
  /** 0–100. Google Ads competition, which is ADVERTISER competition — not how
   *  hard the term is to rank for organically. Useful as a commercial-intent
   *  proxy and misleading as a difficulty score. */
  competitionIndex: number | null
}

export interface KeywordClient {
  /** Volume for an explicit list. Batches internally. */
  searchVolume(keywords: string[], opts?: LocationOpts): Promise<KeywordMetric[]>
  /** Expand one seed into related terms with their volume. */
  relatedKeywords(seed: string, opts?: LocationOpts & { limit?: number }): Promise<KeywordMetric[]>
}

export interface LocationOpts {
  /** Defaults to 2840 — United States. See the note on geo targeting below. */
  locationCode?: number
  languageCode?: string
}

/**
 * United States. Confirmed as the parent code of every US state entry in the
 * DataForSEO locations endpoint.
 *
 * WHY NATIONAL AND NOT CITY-LEVEL, which looks wrong at first glance.
 *
 * The keywords we care about carry their own geography: "deep cleaning katy
 * tx", "house cleaning sugar land". Ask for those with national targeting and
 * you get the volume for that exact phrase, which is the number you want —
 * essentially everyone typing it is in or near Katy anyway.
 *
 * Ask for the same phrase with Katy targeting and you get only searchers whose
 * Google location resolved to Katy, which is a subset of an already-small
 * number, and Google suppresses low counts. You get zeros for terms that have
 * real demand, and then you delete pages that would have worked.
 *
 * Override to a city or state code only for un-modified terms — "house
 * cleaning near me" — where the searcher's location is the only geography in
 * play.
 */
export const US_LOCATION_CODE = 2840
export const DEFAULT_LANGUAGE = 'en'

/* ────────────────────────────────────────────────────────────────────────────
 * Response parsing
 * ──────────────────────────────────────────────────────────────────────────── */

/** DataForSEO v3 wraps everything: { tasks: [ { status_code, result: [...] } ] } */
const EnvelopeSchema = z.object({
  status_code: z.number(),
  status_message: z.string().optional(),
  tasks: z
    .array(
      z.object({
        status_code: z.number(),
        status_message: z.string().optional(),
        result: z.array(z.unknown()).nullable().optional(),
      })
    )
    .nullable()
    .optional(),
})

const VolumeItemSchema = z.object({
  keyword: z.string(),
  search_volume: z.number().nullable().optional(),
  cpc: z.number().nullable().optional(),
  competition_index: z.number().nullable().optional(),
})

const RelatedItemSchema = z.object({
  keyword_data: z.object({
    keyword: z.string(),
    keyword_info: z
      .object({
        search_volume: z.number().nullable().optional(),
        cpc: z.number().nullable().optional(),
        competition: z.number().nullable().optional(),
      })
      .optional(),
  }),
})

/** 20000 is DataForSEO's OK. Anything else is an error, at envelope or task level. */
const OK = 20000

/* ────────────────────────────────────────────────────────────────────────────
 * The real client
 * ──────────────────────────────────────────────────────────────────────────── */

const BASE = 'https://api.dataforseo.com/v3'

/** Hard cap from the API: 1000 keywords per search_volume request. */
const MAX_BATCH = 1000

export class DataForSeoClient implements KeywordClient {
  private readonly auth: string

  constructor(login: string, password: string) {
    if (!login || !password) {
      throw new Error('DataForSeoClient: DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are both required')
    }
    this.auth = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64')
  }

  /** Reads credentials from the environment, or null when they are absent. */
  static fromEnv(): DataForSeoClient | null {
    const login = process.env.DATAFORSEO_LOGIN
    const password = process.env.DATAFORSEO_PASSWORD
    if (!login || !password) return null
    return new DataForSeoClient(login, password)
  }

  private async post(path: string, body: unknown[]): Promise<unknown[]> {
    // v3 always takes an ARRAY of task objects, even for a single task.
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { Authorization: this.auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`DataForSEO ${path} returned HTTP ${res.status} ${res.statusText}`)
    }

    const envelope = EnvelopeSchema.parse(await res.json())
    if (envelope.status_code !== OK) {
      throw new Error(`DataForSEO ${path}: ${envelope.status_code} ${envelope.status_message ?? ''}`)
    }

    const task = envelope.tasks?.[0]
    if (!task) throw new Error(`DataForSEO ${path}: response contained no task`)
    if (task.status_code !== OK) {
      // Task-level failures are the common case — a bad location code, an empty
      // keyword list, an out-of-credit account. The envelope is still 20000.
      throw new Error(`DataForSEO ${path} task failed: ${task.status_code} ${task.status_message ?? ''}`)
    }

    return task.result ?? []
  }

  async searchVolume(keywords: string[], opts: LocationOpts = {}): Promise<KeywordMetric[]> {
    const cleaned = normalizeKeywords(keywords)
    if (cleaned.length === 0) return []

    const out: KeywordMetric[] = []
    for (let i = 0; i < cleaned.length; i += MAX_BATCH) {
      const batch = cleaned.slice(i, i + MAX_BATCH)
      const result = await this.post('/keywords_data/google_ads/search_volume/live', [
        {
          keywords: batch,
          location_code: opts.locationCode ?? US_LOCATION_CODE,
          language_code: opts.languageCode ?? DEFAULT_LANGUAGE,
        },
      ])
      for (const raw of result) {
        const parsed = VolumeItemSchema.safeParse(raw)
        if (!parsed.success) continue
        out.push({
          keyword: parsed.data.keyword,
          searchVolume: parsed.data.search_volume ?? null,
          cpc: parsed.data.cpc ?? null,
          competitionIndex: parsed.data.competition_index ?? null,
        })
      }
    }
    return out
  }

  async relatedKeywords(
    seed: string,
    opts: LocationOpts & { limit?: number } = {}
  ): Promise<KeywordMetric[]> {
    const result = await this.post('/dataforseo_labs/google/related_keywords/live', [
      {
        keyword: seed,
        location_code: opts.locationCode ?? US_LOCATION_CODE,
        language_code: opts.languageCode ?? DEFAULT_LANGUAGE,
        // depth 2 returns up to ~72 terms. depth 3 is ~584 and mostly noise for
        // a local service business; depth 1 is too thin to be worth the call.
        depth: 2,
        limit: opts.limit ?? 100,
      },
    ])

    // Shape here is one result object holding an items[] array, not a flat list.
    const items = (result[0] as { items?: unknown[] } | undefined)?.items ?? []
    const out: KeywordMetric[] = []
    for (const raw of items) {
      const parsed = RelatedItemSchema.safeParse(raw)
      if (!parsed.success) continue
      const info = parsed.data.keyword_data.keyword_info
      out.push({
        keyword: parsed.data.keyword_data.keyword,
        searchVolume: info?.search_volume ?? null,
        cpc: info?.cpc ?? null,
        competitionIndex: info?.competition == null ? null : Math.round(info.competition * 100),
      })
    }
    return out
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stub
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Returns deterministic fake volumes so tests and STUB_MODEL=1 runs exercise
 * the same code path without network or spend. Volume is derived from the
 * keyword string so a given keyword always scores the same — a random number
 * here would make snapshot tests flap.
 */
export class StubKeywordClient implements KeywordClient {
  async searchVolume(keywords: string[]): Promise<KeywordMetric[]> {
    return normalizeKeywords(keywords).map((keyword) => ({
      keyword,
      searchVolume: stableVolume(keyword),
      cpc: 5,
      competitionIndex: 50,
    }))
  }

  async relatedKeywords(seed: string): Promise<KeywordMetric[]> {
    return ['near me', 'cost', 'prices', 'best'].map((suffix) => ({
      keyword: `${seed} ${suffix}`,
      searchVolume: stableVolume(`${seed} ${suffix}`),
      cpc: 5,
      competitionIndex: 50,
    }))
  }
}

function stableVolume(keyword: string): number {
  let hash = 0
  for (let i = 0; i < keyword.length; i++) hash = (hash * 31 + keyword.charCodeAt(i)) >>> 0
  return (hash % 40) * 10
}

/* ────────────────────────────────────────────────────────────────────────────
 * Seeds and selection
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * API limits: 80 characters, 10 words. Lowercased and de-duplicated because
 * the API is case-sensitive on the way in and would happily bill twice for
 * "House Cleaning Katy" and "house cleaning katy".
 */
export function normalizeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>()
  for (const raw of keywords) {
    const k = raw.toLowerCase().trim().replace(/\s+/g, ' ')
    if (k === '' || k.length > 80 || k.split(' ').length > 10) continue
    seen.add(k)
  }
  return [...seen]
}

/**
 * The seed list for a city. Deliberately small — around 30 terms covering the
 * service families that matter, before any related-keyword expansion.
 *
 * `state` is the two-letter code: people type "katy tx", not "katy texas".
 */
export function buildSeeds(city: string, state: string): string[] {
  const c = city.toLowerCase()
  const st = state.toLowerCase()
  const services = [
    'house cleaning',
    'cleaning services',
    'maid service',
    'deep cleaning',
    'move out cleaning',
    'apartment cleaning',
    'airbnb cleaning',
    'post construction cleaning',
    'office cleaning',
    'home cleaning',
  ]

  const seeds: string[] = []
  for (const s of services) {
    seeds.push(`${s} ${c}`)
    seeds.push(`${s} ${c} ${st}`)
  }
  seeds.push(`cleaning services near me`, `house cleaning near me`, `maid service near me`)
  return normalizeKeywords(seeds)
}

/** Seeds for one area page: the service families that carry local intent. */
export function buildAreaSeeds(area: string, state: string): string[] {
  const a = area.toLowerCase()
  const st = state.toLowerCase()
  return normalizeKeywords(
    ['house cleaning', 'cleaning services', 'maid service', 'deep cleaning', 'move out cleaning']
      .flatMap((s) => [`${s} ${a}`, `${s} ${a} ${st}`])
  )
}

/**
 * What actually reaches the prompts.
 *
 * Zero-volume terms are KEPT if they carry the city or an area name. Local
 * long-tail is systematically under-reported — Google's data is bucketed and
 * suppresses low counts, so "deep cleaning cinco ranch tx" reads as zero while
 * still converting. Dropping those would delete the pages most worth having.
 * Zero-volume terms with no geography in them are dropped; they are noise.
 */
export function selectKeywords(
  metrics: KeywordMetric[],
  geoTerms: string[],
  limit = 20
): string[] {
  const geo = geoTerms.map((g) => g.toLowerCase())
  const carriesGeo = (k: string) => geo.some((g) => k.includes(g))

  return metrics
    .filter((m) => (m.searchVolume ?? 0) > 0 || carriesGeo(m.keyword))
    .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
    .slice(0, limit)
    .map((m) => m.keyword)
}
