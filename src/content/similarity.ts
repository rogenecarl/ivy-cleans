// src/content/similarity.ts
// Cross-city duplication checks. Houston and Miami shared a 125-char verbatim run with Minneapolis because the
// prompt's one-sentence examples can only be reproduced. Verbatim scan on every pair; shingles only for slots that pass.

// ── Normalisation ──

// fold case, whitespace and U+2019 before comparing
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Verbatim runs ──

/** Every substring of exactly `len` characters in `text`. */
function windows(text: string, len: number): Set<string> {
  const out = new Set<string>()
  for (let i = 0; i + len <= text.length; i++) out.add(text.slice(i, i + len))
  return out
}

/** Is there any shared run of at least `len` characters? O(n + m). */
function sharesRunOfLength(a: string, b: string, len: number): boolean {
  if (len <= 0 || a.length < len || b.length < len) return false
  const seen = windows(a, len)
  for (let i = 0; i + len <= b.length; i++) {
    if (seen.has(b.slice(i, i + len))) return true
  }
  return false
}

// longest shared verbatim run, or ''; binary search on length, O((n+m) log n)
export function longestSharedRun(rawA: string, rawB: string): string {
  const a = normalize(rawA)
  const b = normalize(rawB)

  let lo = 0
  let hi = Math.min(a.length, b.length)
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    if (sharesRunOfLength(a, b, mid)) lo = mid
    else hi = mid - 1
  }
  if (lo === 0) return ''

  const seen = windows(a, lo)
  for (let i = 0; i + lo <= b.length; i++) {
    const slice = b.slice(i, i + lo)
    if (seen.has(slice)) return slice
  }
  return ''
}

// ── Shingle similarity ──

function shingles(text: string, k: number): Set<string> {
  const words = normalize(text).split(' ').filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + k <= words.length; i++) out.add(words.slice(i, i + k).join(' '))
  return out
}

// Jaccard over 5-word shingles: catches the reworded case
export function shingleSimilarity(a: string, b: string, k = 5): number {
  const sa = shingles(a, k)
  const sb = shingles(b, k)
  if (sa.size === 0 || sb.size === 0) return 0
  let shared = 0
  for (const s of sa) if (sb.has(s)) shared++
  return shared / (sa.size + sb.size - shared)
}

// ── The gate ──

export interface SimilarityFinding {
  kind: 'verbatim' | 'shingle'
  slot: string
  otherCity: string
  otherSlot: string
  detail: string
}

export interface SimilarityThresholds {
  /** Shared verbatim run, in characters, that fails a slot. */
  maxRun: number
  /** Jaccard similarity against the SAME slot in another city. */
  maxCrossCity: number
  /** Jaccard similarity against a SIBLING area in the same city. */
  maxSibling: number
}

export const DEFAULT_THRESHOLDS: SimilarityThresholds = {
  maxRun: 60,
  maxCrossCity: 0.8,
  maxSibling: 0.75,
}

// slots allowed to be identical across cities: hero paragraphs 4 and 5, one-sentence brand lines. Nothing else.
export const EXEMPT_SLOTS: ReadonlySet<string> = new Set<string>([
  // 'services.heroParagraphs' is an array; index-level exemption is applied
  // in flattenSections below.
])

/** Hero array indices exempt from the cross-city check (0-based). */
const EXEMPT_HERO_INDICES: ReadonlySet<number> = new Set([3, 4])

export type SectionMap = Record<string, string | string[]>

/** Flattens a sections map to (slotId, text) pairs, dropping exempt entries. */
export function flattenSections(sections: SectionMap): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const [slot, value] of Object.entries(sections)) {
    if (EXEMPT_SLOTS.has(slot)) continue
    if (Array.isArray(value)) {
      value.forEach((text, i) => {
        if (slot === 'services.heroParagraphs' && EXEMPT_HERO_INDICES.has(i)) return
        out.push([`${slot}[${i}]`, text])
      })
    } else {
      out.push([slot, value])
    }
  }
  return out
}

// one city against every published city, and against its own sibling areas. Returns findings; publishCity refuses on them.
export function checkCity(
  city: string,
  sections: SectionMap,
  published: Array<{ city: string; sections: SectionMap }>,
  thresholds: SimilarityThresholds = DEFAULT_THRESHOLDS
): SimilarityFinding[] {
  const findings: SimilarityFinding[] = []
  const mine = flattenSections(sections)

  // 1 · against every other published city
  for (const other of published) {
    if (other.city === city) continue
    const theirs = flattenSections(other.sections)
    for (const [slot, text] of mine) {
      for (const [otherSlot, otherText] of theirs) {
        const run = longestSharedRun(text, otherText)
        if (run.length >= thresholds.maxRun) {
          findings.push({
            kind: 'verbatim',
            slot,
            otherCity: other.city,
            otherSlot,
            detail: `${run.length} characters shared verbatim: "${run.slice(0, 80)}${run.length > 80 ? '…' : ''}"`,
          })
          continue // a verbatim hit is the stronger finding; skip the shingle test
        }
        // Same-slot comparison only: a hero paragraph and an area paragraph
        // being loosely similar is not interesting, two hero paragraphs are.
        if (slot === otherSlot) {
          const sim = shingleSimilarity(text, otherText)
          if (sim > thresholds.maxCrossCity) {
            findings.push({
              kind: 'shingle',
              slot,
              otherCity: other.city,
              otherSlot,
              detail: `${(sim * 100).toFixed(0)}% similar to the same slot in ${other.city}`,
            })
          }
        }
      }
    }
  }

  // 2 · area pages against their own siblings — the failure mode that put
  //     twenty-four Minneapolis pages at position 46
  const suburbSlots = mine.filter(([slot]) => slot.startsWith('suburb.'))
  for (let i = 0; i < suburbSlots.length; i++) {
    for (let j = i + 1; j < suburbSlots.length; j++) {
      const [slotA, textA] = suburbSlots[i]
      const [slotB, textB] = suburbSlots[j]
      // Compare like with like: intro to intro, homes to homes, local to local.
      const kindA = slotA.split('.').pop()
      const kindB = slotB.split('.').pop()
      if (kindA !== kindB) continue
      const sim = shingleSimilarity(textA, textB)
      if (sim > thresholds.maxSibling) {
        findings.push({
          kind: 'shingle',
          slot: slotA,
          otherCity: city,
          otherSlot: slotB,
          detail: `${(sim * 100).toFixed(0)}% similar to its sibling area page`,
        })
      }
    }
  }

  return findings
}

// ── Invisible-character guard ──

// characters that render as nothing but change the bytes — a zero-width space defeats the duplication check.
// U+2019, en and em dashes are NOT here: the style rules require them.
const INVISIBLE_CHARS: ReadonlyMap<string, string> = new Map([
  [' ', 'NO-BREAK SPACE'],
  ['­', 'SOFT HYPHEN'],
  ['᠎', 'MONGOLIAN VOWEL SEPARATOR'],
  [' ', 'EN QUAD'],
  [' ', 'EM QUAD'],
  [' ', 'EN SPACE'],
  [' ', 'EM SPACE'],
  [' ', 'THREE-PER-EM SPACE'],
  [' ', 'FOUR-PER-EM SPACE'],
  [' ', 'SIX-PER-EM SPACE'],
  [' ', 'FIGURE SPACE'],
  [' ', 'PUNCTUATION SPACE'],
  [' ', 'THIN SPACE'],
  [' ', 'HAIR SPACE'],
  ['​', 'ZERO WIDTH SPACE'],
  ['‌', 'ZERO WIDTH NON-JOINER'],
  ['‍', 'ZERO WIDTH JOINER'],
  ['‎', 'LEFT-TO-RIGHT MARK'],
  ['‏', 'RIGHT-TO-LEFT MARK'],
  ['‪', 'LEFT-TO-RIGHT EMBEDDING'],
  ['‫', 'RIGHT-TO-LEFT EMBEDDING'],
  ['‬', 'POP DIRECTIONAL FORMATTING'],
  ['‭', 'LEFT-TO-RIGHT OVERRIDE'],
  ['‮', 'RIGHT-TO-LEFT OVERRIDE'],
  [' ', 'NARROW NO-BREAK SPACE'],
  [' ', 'MEDIUM MATHEMATICAL SPACE'],
  ['⁠', 'WORD JOINER'],
  ['⁡', 'FUNCTION APPLICATION'],
  ['⁢', 'INVISIBLE TIMES'],
  ['⁣', 'INVISIBLE SEPARATOR'],
  ['⁤', 'INVISIBLE PLUS'],
  ['⁦', 'LEFT-TO-RIGHT ISOLATE'],
  ['⁧', 'RIGHT-TO-LEFT ISOLATE'],
  ['⁨', 'FIRST STRONG ISOLATE'],
  ['⁩', 'POP DIRECTIONAL ISOLATE'],
  ['　', 'IDEOGRAPHIC SPACE'],
  ['﻿', 'ZERO WIDTH NO-BREAK SPACE (BOM)'],
])

export interface InvisibleFinding {
  slot: string
  detail: string
}

// invisible ranges (blocks, not single codepoints)
function rangeName(cp: number): string | undefined {
  if (cp >= 0xe0000 && cp <= 0xe007f) return 'TAG CHARACTER'
  if (cp >= 0xfe00 && cp <= 0xfe0f) return 'VARIATION SELECTOR'
  if (cp >= 0xe0100 && cp <= 0xe01ef) return 'VARIATION SELECTOR SUPPLEMENT'
  return undefined
}

function codepoint(ch: string): string {
  return `U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`
}

/** Every invisible character in one string, with its codepoint and name. */
function scan(slot: string, text: string): InvisibleFinding[] {
  const out: InvisibleFinding[] = []
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0
    // The Unicode TAG block (U+E0000–U+E007F) is enumerated by range rather
    // than listed: it is 128 codepoints and every one of them is invisible.
    const name = INVISIBLE_CHARS.get(ch) ?? rangeName(cp)
    if (name !== undefined) out.push({ slot, detail: `${codepoint(ch)} ${name}` })
  }
  return out
}

// every slot, no exemptions: an invisible character in a brand line is still a defect
export function findInvisibleChars(sections: SectionMap): InvisibleFinding[] {
  const out: InvisibleFinding[] = []
  for (const [slot, value] of Object.entries(sections)) {
    if (Array.isArray(value)) {
      value.forEach((text, i) => out.push(...scan(`${slot}[${i}]`, text)))
    } else {
      out.push(...scan(slot, value))
    }
  }
  return out
}
