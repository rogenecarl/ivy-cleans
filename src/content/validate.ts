// src/content/validate.ts
/*
 * Hand-rolled runtime validation for CityContent documents (no new deps).
 * One bad city document must 404 that city only — so this accumulates
 * EVERY problem before throwing, rather than failing on the first one.
 */
import type { CityContent } from './types'

function isString(v: unknown): v is string {
  return typeof v === 'string'
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString)
}

function isStringOrStringArray(v: unknown): v is string | string[] {
  return isString(v) || isStringArray(v)
}

function isStringOrNull(v: unknown): v is string | null {
  return v === null || isString(v)
}

function isCondition(v: unknown): v is { condition: string; implication: string; copySafe: boolean } {
  return (
    v !== null &&
    typeof v === 'object' &&
    isString((v as Record<string, unknown>).condition) &&
    isString((v as Record<string, unknown>).implication) &&
    typeof (v as Record<string, unknown>).copySafe === 'boolean'
  )
}

export function validateCityContent(raw: unknown): CityContent {
  const errors: string[] = []

  if (raw === null || typeof raw !== 'object') {
    throw new Error('invalid city document: not an object')
  }
  const doc = raw as Record<string, unknown>

  // -- top-level required strings --
  for (const field of ['city', 'state', 'phone', 'phoneHref', 'address', 'stateName', 'phoneDisplay'] as const) {
    if (!isString(doc[field]) || doc[field] === '') {
      errors.push(`${field} must be a non-empty string`)
    }
  }

  // -- status --
  if (doc.status !== 'draft' && doc.status !== 'live') {
    errors.push(`status must be 'draft' or 'live'`)
  }

  // -- domain (optional string) --
  if (doc.domain !== undefined && !isString(doc.domain)) {
    errors.push('domain must be a string when present')
  }

  // -- contactAddress (optional string) --
  if (doc.contactAddress !== undefined && !isString(doc.contactAddress)) {
    errors.push('contactAddress must be a string when present')
  }

  // -- research --
  const research = doc.research
  if (research === null || typeof research !== 'object') {
    errors.push('research must be an object')
  } else {
    const r = research as Record<string, unknown>
    if (!Array.isArray(r.suburbs)) {
      errors.push('research.suburbs must be an array')
    } else {
      r.suburbs.forEach((s, i) => {
        if (
          s === null ||
          typeof s !== 'object' ||
          !isString((s as Record<string, unknown>).name) ||
          !isString((s as Record<string, unknown>).slug) ||
          !isStringArray((s as Record<string, unknown>).subdivisions) ||
          !isString((s as Record<string, unknown>).housingCharacter) ||
          !Array.isArray((s as Record<string, unknown>).conditions) ||
          !((s as Record<string, unknown>).conditions as unknown[]).every(isCondition)
        ) {
          errors.push(
            `research.suburbs[${i}] must be { name: string, slug: string, subdivisions: string[], housingCharacter: string, conditions: Condition[] }`,
          )
        }
      })
    }
    if (!isStringArray(r.zips)) {
      errors.push('research.zips must be an array of strings')
    }
    if (!Array.isArray(r.conditions) || !r.conditions.every(isCondition)) {
      errors.push('research.conditions must be an array of { condition: string, implication: string, copySafe: boolean }')
    }
    if (!isStringOrNull(r.mapEmbedUrl)) {
      errors.push('research.mapEmbedUrl must be a string or null')
    }
    // A document generated before this shape landed carries dead `landmarks`
    // data — reject it explicitly rather than silently dropping the field.
    if ('landmarks' in r) {
      errors.push('research.landmarks is no longer a valid field (moved to research.conditions)')
    }
  }

  // -- sections: object of string | string[] --
  const sections = doc.sections
  if (sections === null || typeof sections !== 'object' || Array.isArray(sections)) {
    errors.push('sections must be an object')
  } else {
    for (const [key, value] of Object.entries(sections as Record<string, unknown>)) {
      if (!isStringOrStringArray(value)) {
        errors.push(`sections.${key} must be a string or string[]`)
      }
    }
  }

  // -- maps: three keys, each string | null --
  const maps = doc.maps
  if (maps === null || typeof maps !== 'object') {
    errors.push('maps must be an object with front, home, contact')
  } else {
    const m = maps as Record<string, unknown>
    for (const key of ['front', 'home', 'contact'] as const) {
      if (!isStringOrNull(m[key])) {
        errors.push(`maps.${key} must be a string or null`)
      }
    }
  }

  // -- hasSuburbPages --
  if (typeof doc.hasSuburbPages !== 'boolean') {
    errors.push('hasSuburbPages must be a boolean')
  }

  if (errors.length > 0) {
    throw new Error('invalid city document: ' + errors.join('; '))
  }

  return doc as unknown as CityContent
}
