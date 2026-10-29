// The fact-check stage, one item (an area slug, or '_city') per call: code checks first, then one Haiku call for the
// claims code could not settle. Anything not confirmed comes out of the research the writers see.
import type { DraftDoc } from '@/server/content/drafts'
import { researchFromClaims, type ClaimStatus, type ResearchClaim } from '@/server/pipeline/claims'
import { checkPlace, checkZip, type GeoPoint, type Geocoder } from '@/server/pipeline/geo'
import { MODELS, type ModelClient } from '@/server/pipeline/model'
import { FactCheckSchema } from '@/server/pipeline/schemas'
import { FACT_CHECK_SYSTEM, buildFactCheckPrompt } from './prompts'
import { MODEL_KEYS } from './research'

export const CITY_ITEM = '_city'

type Outcome = { status: ClaimStatus; reason?: string }

export function itemOf(claim: ResearchClaim): string {
  return claim.area ?? CITY_ITEM
}

/** Items that still have a claim waiting for its check, in research order, the city-wide item last. */
export function pendingVerifyItems(draft: DraftDoc): string[] {
  const pending = new Set((draft.claims ?? []).filter((c) => c.status === 'pending').map(itemOf))
  const areas = (draft.researchFull?.suburbs ?? []).map((s) => s.slug).filter((slug) => pending.has(slug))
  return pending.has(CITY_ITEM) ? [...areas, CITY_ITEM] : areas
}

export async function verifyItem(args: {
  client: ModelClient
  geocoder: Geocoder
  draft: DraftDoc
  item: string
}): Promise<void> {
  const { client, geocoder, draft, item } = args
  const { facts } = draft
  const claims = draft.claims ?? []
  const pending = claims.filter((c) => c.status === 'pending' && itemOf(c) === item)
  if (pending.length === 0 || !draft.researchFull) return

  const cache = (draft.geocodes ??= {})
  // a failed lookup is neutral and not cached, so a resume can try again
  const locate = async (query: string): Promise<GeoPoint | null> => {
    if (query in cache) return cache[query]
    try {
      const point = await geocoder.locate(query)
      cache[query] = point
      return point
    } catch {
      return null
    }
  }

  const city = await locate(`${facts.city}, ${facts.state}`)
  const areaName = item === CITY_ITEM ? null : (draft.researchFull.suburbs.find((s) => s.slug === item)?.name ?? null)
  const outcome = new Map<string, Outcome>()

  for (const c of pending) {
    if (c.kind === 'zip') {
      const verdict = checkZip(c.text, city, facts.state)
      outcome.set(c.id, {
        status: verdict,
        ...(verdict === 'wrong' ? { reason: `ZIP ${c.text} is not in or near ${facts.city}` } : {}),
        ...(verdict === 'unconfirmed' ? { reason: `ZIP ${c.text} is not in the Census ZIP list` } : {}),
      })
    } else if (c.kind === 'area' || c.kind === 'subdivision') {
      const query = c.kind === 'area' ? `${c.text}, ${facts.state}` : `${c.text}, ${areaName ?? facts.city}, ${facts.state}`
      const place = checkPlace(await locate(query), city, facts.state)
      if (place.verdict === 'far') outcome.set(c.id, { status: 'unconfirmed', reason: place.reason })
    }
  }

  const ask = pending.filter((c) => !outcome.has(c.id))
  if (ask.length > 0) {
    const { verdicts } = await client.generate({
      schema: FactCheckSchema,
      key: MODEL_KEYS.verify(item),
      system: FACT_CHECK_SYSTEM,
      prompt: buildFactCheckPrompt(facts, ask, draft.sources ?? [], areaName),
      model: MODELS.check,
    })
    const byId = new Map(verdicts.map((v) => [v.id, v]))
    for (const c of ask) {
      const v = byId.get(c.id)
      if (!v) outcome.set(c.id, { status: 'unconfirmed', reason: 'the check gave no answer for it' })
      else if (v.verdict === 'supported') outcome.set(c.id, { status: 'confirmed' })
      else outcome.set(c.id, { status: v.verdict === 'contradicted' ? 'wrong' : 'unconfirmed', reason: v.reason })
    }
  }

  draft.claims = claims.map((c) => {
    const o = outcome.get(c.id)
    return o ? { ...c, status: o.status, ...(o.reason ? { reason: o.reason } : {}) } : c
  })
  draft.research = researchFromClaims(draft.researchFull, draft.claims)
}
