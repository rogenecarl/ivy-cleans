import { deleteDraft, finalizeDraft, findDraft, publishCity, saveDraft } from '@/server/content/drafts'
import { readCityDoc, revalidateCity, writeCityDoc } from '@/server/content/store'
import type { Suburb as StoredSuburb } from '@/server/content/types'
import { buildProvisioners, checkDomainLive } from '@/server/pipeline/provision'
import { aboutReady } from '@/server/pipeline/about'
import type { Suburb } from '@/server/pipeline/schemas'
import { normalizeSlug, reservedSlugs } from '@/server/pipeline/stages'
import { type ActionResult, attempt, errorMessage, type SuburbRow } from './shared'
import { readMarketLogic } from './sites'
import { writeAboutStoryLogic } from './photos'

export async function finalizeLogic(key: string): Promise<ActionResult> {
  const result = await attempt(() => finalizeDraft(key))
  if (result.ok) await writeAboutStoryIfReady(key)
  return result
}

// Part of generating a city: once the site is assembled, a city that already has its About facts gets its story in
// the same run. Never fails the run; a refused draft is retried once, then left for the button in Settings.
async function writeAboutStoryIfReady(key: string): Promise<void> {
  try {
    const market = await readMarketLogic(key)
    if (!market.ok || market.story || !aboutReady(market.ops)) return
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const written = await writeAboutStoryLogic(key)
      if (written.ok) return
      console.error(`finalize: About story for "${key}" attempt ${attempt} was not saved: ${written.error}`)
    }
  } catch (err) {
    console.error(`finalize: About story for "${key}" failed:`, err)
  }
}

// flip to live, map or buy a host, retire the sidecar. `provision` spends money, so it is explicit.
export async function publishLogic(
  key: string,
  domain?: string,
  provision?: boolean,
): Promise<ActionResult> {
  const host = domain?.trim()
  return attempt(() =>
    publishCity(key, {
      ...(host ? { domain: host } : {}),
      ...(provision ? { provisionDomain: true } : {}),
    }),
  )
}

// is a provisioned domain serving yet? The browser polls this; clears doc.provisioning once yes.
export async function checkProvisioningLogic(
  key: string,
): Promise<{ ok: true; live: boolean; domain: string | null } | { ok: false; error: string }> {
  try {
    const doc = await readCityDoc(key)
    if (!doc) return { ok: false, error: `no published document found for "${key}"` }
    if (!doc.provisioning) return { ok: true, live: true, domain: doc.domain ?? null }

    const { host } = buildProvisioners()
    const live = await checkDomainLive(host, doc.provisioning.domain)
    if (live) {
      delete doc.provisioning
      await writeCityDoc(key, doc)
      revalidateCity(key)
    }
    return { ok: true, live, domain: doc.provisioning?.domain ?? doc.domain ?? null }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

/** Removes an in-progress draft sidecar (dashboard housekeeping). */
export async function discardDraftLogic(key: string): Promise<ActionResult> {
  return attempt(() => deleteDraft(key))
}

// ── Suburb editing ──

// editor text through the same slug normaliser as model output; empty and duplicate rows dropped
export function normalizeSuburbs(rows: SuburbRow[]): SuburbRow[] {
  const seen = new Set<string>()
  const out: SuburbRow[] = []
  for (const row of rows) {
    const name = row.name.trim()
    // An empty slug field is a convenience, not an error: fall back to the
    // name so the operator can add a row by typing only what it is called.
    const slug = normalizeSlug(row.slug.trim() === '' ? name : row.slug)
    if (name === '' || slug === '' || seen.has(slug)) continue
    seen.add(slug)
    out.push({ name, slug })
  }
  return out
}

// rows carry name + slug; research fields are matched back by slug. An unknown slug is a hand-added row with empty research.
function mergeSuburbRows(rows: readonly SuburbRow[], existing: readonly StoredSuburb[]): Suburb[] {
  const bySlug = new Map(existing.map((s) => [s.slug, s]))
  return rows.map((row) => {
    const prior = bySlug.get(row.slug)
    return {
      name: row.name,
      slug: row.slug,
      subdivisions: prior?.subdivisions ?? [],
      housingCharacter: prior?.housingCharacter ?? '',
      conditions: prior?.conditions ?? [],
      neighbors: prior?.neighbors ?? [],
    }
  })
}
function removedSlugs(before: readonly { slug: string }[], after: readonly SuburbRow[]): Set<string> {
  const now = new Set(after.map((r) => r.slug))
  return new Set(before.map((s) => s.slug).filter((slug) => !now.has(slug)))
}

// a city between finalize and publish has both a sidecar and a document; update both
export async function updateSuburbsLogic(key: string, rows: SuburbRow[]): Promise<ActionResult> {
  try {
    const suburbs = normalizeSuburbs(rows)
    if (suburbs.length === 0) {
      return { ok: false, error: 'at least one suburb with a name is required' }
    }

    const draft = await findDraft(key)
    const doc = await readCityDoc(key)

    // a colliding slug would shadow a page; tell the operator which
    const cityName = draft?.facts.city ?? doc?.city ?? key
    const collision = suburbs.find((s) => reservedSlugs(cityName).has(s.slug))
    if (collision) {
      return {
        ok: false,
        error: `"${collision.slug}" is reserved by an existing page — choose a different slug for "${collision.name}".`,
      }
    }

    let touched = false

    if (draft?.research) {
      // only a row the editor showed and the operator removed takes its claims with it; areas the editor never
      // listed (dropped, wrong, gated out) keep their record
      const removed = removedSlugs(draft.research.suburbs, suburbs)
      draft.research = { ...draft.research, suburbs: mergeSuburbRows(suburbs, draft.research.suburbs) }
      if (draft.researchFull) {
        const shown = new Set(suburbs.map((s) => s.slug))
        const hidden = draft.researchFull.suburbs.filter((s) => !shown.has(s.slug) && !removed.has(s.slug))
        draft.researchFull = {
          ...draft.researchFull,
          suburbs: [...mergeSuburbRows(suburbs, draft.researchFull.suburbs), ...hidden],
        }
      }
      if (draft.claims) draft.claims = draft.claims.filter((c) => c.area === null || !removed.has(c.area))
      await saveDraft(key, draft)
      touched = true
    }

    if (doc) {
      const removedFromDoc = removedSlugs(doc.research.suburbs, suburbs)
      doc.research = { ...doc.research, suburbs: mergeSuburbRows(suburbs, doc.research.suburbs) }
      if (doc.claims) doc.claims = doc.claims.filter((c) => c.area === null || !removedFromDoc.has(c.area))
      await writeCityDoc(key, doc)
      touched = true
    }

    if (!touched) {
      return { ok: false, error: `no draft research or published document found for "${key}"` }
    }

    revalidateCity(key)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}
