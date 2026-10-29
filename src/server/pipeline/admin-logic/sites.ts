import { readFile } from 'node:fs/promises'
import { CITIES_JSON, findDraft, listDrafts, saveDraft } from '@/server/content/drafts'
import { getCity, readCityDoc, revalidateCity, writeCityDoc } from '@/server/content/store'
import { pendingAddress, realAddress } from '@/server/content/interpolate'
import { phoneDigitsFrom, phoneFields } from '@/server/pipeline/facts'
import { ABOUT_STORY_SLOT } from '@/server/pipeline/about'
import type { MarketOps } from '@/server/pipeline/schemas'
import { STAGE_IDS } from '@/server/pipeline/stages'
import { type ActionResult, type CityRow, editCity, errorMessage } from './shared'
import { buildOps, formatOpsFields, type OpsFields } from './create'

// ── Ops editing ──

// stored ops as form text; the sidecar wins when both exist
export async function readOpsLogic(
  key: string,
): Promise<{ ok: true; fields: OpsFields } | { ok: false; error: string }> {
  try {
    const draft = await findDraft(key)
    if (draft) return { ok: true, fields: formatOpsFields(draft.facts.ops) }

    const doc = await readCityDoc(key)
    if (doc) return { ok: true, fields: formatOpsFields(doc.ops) }

    return { ok: false, error: `no draft or published document found for "${key}"` }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

// write edited facts wherever the city lives (sidecar, document, or both). Changes what the NEXT generation is given.
export async function updateOpsLogic(key: string, fields: OpsFields): Promise<ActionResult> {
  try {
    // Parse before touching anything, so a malformed review line leaves the
    // stored facts exactly as they were rather than half-replacing them.
    const built = buildOps(fields)
    if (!built.ok) return { ok: false, error: built.error }

    // photos survive a save: the form has no photo input and buildOps replaces the whole block
    const keepPhotos = (previous: MarketOps | undefined): MarketOps | undefined => {
      const photos = previous?.photos
      if (!photos?.length) return built.ops
      return { ...(built.ops ?? {}), photos }
    }

    return await editCity(key, (current) => ({ ops: keepPhotos(current.ops), sections: current.sections }))
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

// ── Dashboard listing ──

async function readCityKeys(): Promise<string[]> {
  try {
    return JSON.parse(await readFile(CITIES_JSON, 'utf-8')) as string[]
  } catch {
    return []
  }
}

// Every city in one list. _cities.json holds finalized cities, listDrafts() holds sidecars; a finalized-not-published
// city is in both (the document wins for status). Sidecars first, documents on top; an unloadable document with no sidecar is 'error'.
export async function listCities(): Promise<CityRow[]> {
  const rows = new Map<string, CityRow>()

  for (const draft of await listDrafts()) {
    rows.set(draft.key, {
      key: draft.key,
      city: draft.city,
      status: draft.done.length < STAGE_IDS.length ? 'generating' : 'draft-unfinalized',
      hasDraft: true,
      doneCount: draft.done.length,
    })
  }

  const keys = await readCityKeys()
  const docs = await Promise.allSettled(keys.map((key) => getCity(key)))
  keys.forEach((key, i) => {
    const draftRow = rows.get(key)
    const loaded = docs[i]
    if (loaded.status === 'fulfilled') {
      const doc = loaded.value
      rows.set(key, {
        key,
        city: doc.city,
        status: doc.status,
        hasDraft: draftRow !== undefined,
        ...(draftRow?.doneCount !== undefined ? { doneCount: draftRow.doneCount } : {}),
      })
    } else if (!draftRow) {
      rows.set(key, { key, city: key, status: 'error', hasDraft: false, error: errorMessage(loaded.reason) })
    }
  })

  return [...rows.values()].sort((a, b) => a.city.localeCompare(b.city))
}


// ---- About page: market facts, photos and the story ------------------------------------------------------------

export type MarketSnapshot =
  | {
      ok: true
      city: string
      state: string
      stateName: string
      status: 'draft' | 'live'
      /** Display format, as the form shows it. */
      phone: string
      /** '' when there is none yet (the finalize placeholder counts as none). */
      address: string
      ops: MarketOps | undefined
      story: string[] | undefined
      areaNames: string[]
    }
  | { ok: false; error: string }

/** Everything the Settings screen shows about one city's About Us page, from the draft when there is one, else the published document. */
export async function readMarketLogic(key: string): Promise<MarketSnapshot> {
  try {
    const draft = await findDraft(key)
    if (draft) {
      const story = draft.sections[ABOUT_STORY_SLOT]
      return {
        ok: true,
        city: draft.facts.city,
        state: draft.facts.state,
        stateName: draft.facts.stateName,
        status: 'draft',
        phone: draft.facts.phoneDisplay,
        address: draft.facts.address ?? '',
        ops: draft.facts.ops,
        story: Array.isArray(story) ? story : undefined,
        areaNames: draft.research?.suburbs.map((s) => s.name) ?? [],
      }
    }
    const doc = await readCityDoc(key)
    if (doc) {
      const story = doc.sections[ABOUT_STORY_SLOT]
      return {
        ok: true,
        city: doc.city,
        state: doc.state,
        stateName: doc.state,
        status: 'live',
        phone: doc.phoneDisplay,
        address: realAddress(doc.address) ?? '',
        ops: doc.ops,
        story: Array.isArray(story) ? story : undefined,
        areaNames: doc.research.suburbs.map((s) => s.name),
      }
    }
    return { ok: false, error: `no draft or published document found for "${key}"` }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

// ---- Phone and address -------------------------------------------------------------------------------------------

/**
 * Phone and street address wherever the city lives (sidecar, document, or both). Every phone format is derived here,
 * as at creation. A live city cannot lose its address; a draft without one goes back to the finalize placeholder.
 */
export async function updateContactLogic(key: string, input: { phone: string; address: string }): Promise<ActionResult> {
  try {
    const digits = phoneDigitsFrom(input.phone)
    if (digits === null) return { ok: false, error: 'the phone number must be 10 digits, like (612) 555-0142' }
    const phone = phoneFields(digits)
    const address = input.address.trim()

    const draft = await findDraft(key)
    const doc = await readCityDoc(key)
    if (!draft && !doc) return { ok: false, error: `no draft or published document found for "${key}"` }
    if (address === '' && doc?.status === 'live') {
      return { ok: false, error: 'a live city needs a street address; it is printed on the contact page' }
    }

    if (draft) {
      const facts = { ...draft.facts, ...phone }
      if (address) facts.address = address
      else delete facts.address
      draft.facts = facts
      await saveDraft(key, draft)
    }
    if (doc) {
      Object.assign(doc, phone)
      // the contact page's own variant survives a save that leaves the address as it was
      if (address !== realAddress(doc.address)) {
        if (address) {
          doc.address = address
          doc.contactAddress = address
        } else {
          doc.address = pendingAddress(doc.city)
          delete doc.contactAddress
        }
      }
      await writeCityDoc(key, doc)
    }
    revalidateCity(key)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}
