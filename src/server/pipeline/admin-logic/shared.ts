import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { validateCityContent } from '@/server/content/validate'
import type { CityContent } from '@/server/content/types'
import { STAGE_IDS, type StageId } from '@/server/pipeline/stages'

export const CONTENT_DIR = path.join(process.cwd(), 'content')
export const CITIES_JSON = path.join(CONTENT_DIR, '_cities.json')

export type ActionResult = { ok: true } | { ok: false; error: string }
export type CreateResult = { ok: true; key: string } | { ok: false; error: string }

// editor row: name and slug only, never the researched fields
export type SuburbRow = { name: string; slug: string }

/** Dashboard row states. See listCities() for how each is decided. */
export type CityStatus = 'live' | 'draft' | 'generating' | 'draft-unfinalized' | 'error'

export type CityRow = {
  key: string
  city: string
  status: CityStatus
  /** True when a draft sidecar is still on disk (i.e. not yet published). */
  hasDraft: boolean
  /** How many of the four stages have completed, when a sidecar exists. */
  doneCount?: number
  /** Populated when status is 'error'. */
  error?: string
}

/** Narrows an unknown thrown value to a message an operator can read. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

/** Wraps a void-returning operation in the serializable result shape. */
export async function attempt(run: () => Promise<void>): Promise<ActionResult> {
  try {
    await run()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

export function isStageId(value: string): value is StageId {
  return (STAGE_IDS as readonly string[]).includes(value)
}


export async function readCityDoc(key: string): Promise<CityContent | null> {
  try {
    const raw = await readFile(path.join(CONTENT_DIR, `${key}.json`), 'utf-8')
    return validateCityContent(JSON.parse(raw))
  } catch {
    return null
  }
}
