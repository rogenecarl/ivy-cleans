// src/content/similarity.ts
/*
 * Cross-city duplication checks. No new dependencies, matching validate.ts.
 *
 * This exists because it already happened. Houston and Miami each share a
 * 125-character verbatim run with Minneapolis — "...r business, give our
 * professional cleaning company a call today, request your quote, and put our
 * skills to an effective test!" — and Minneapolis's "our business ethos is
 * unmatched" arrived in Houston as "our standard of work is unmatched".
 *
 * The cause is structural rather than a prompt failure. buildFrontPrompt shows
 * the model the real Minneapolis paragraphs and says "match the SHAPE, never
 * copy its sentences". For the long paragraphs that instruction is satisfiable.
 * For hero paragraphs 4 and 5, which are a single sentence each, there is
 * nothing left to match once you match the shape — so the example gets
 * reproduced, exactly as asked and exactly wrong.
 *
 * Three sites in one brand network sharing sentences is the fingerprint that
 * matters, and nothing in the codebase looked for it: validate.ts checks types
 * and shapes, never content against other cities.
 *
 * Cheap first, expensive second. runCheck() runs the verbatim scan on every
 * pair and only computes shingle similarity for slots that pass it.
 */

/* ──────────────────────────────────────────────────────────────────────────
 * Normalisation
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Casing, whitespace and apostrophe style are not what we are testing for.
 * U+2019 is folded to ASCII so a copy that survived a straight-quote round
 * trip still matches its source.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/* ──────────────────────────────────────────────────────────────────────────
 * Verbatim runs
 * ────────────────────────────────────────────────────────────────────────── */

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

/**
 * The longest run of characters the two strings share verbatim, or ''.
 *
 * Binary search on length over the O(n+m) membership test above, so the whole
 * thing is O((n + m) log n) — fast enough to run every city against every
 * other on each publish without anyone noticing.
 */
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

/* ──────────────────────────────────────────────────────────────────────────
 * Shingle similarity
 * ────────────────────────────────────────────────────────────────────────── */

function shingles(text: string, k: number): Set<string> {
  const words = normalize(text).split(' ').filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + k <= words.length; i++) out.add(words.slice(i, i + k).join(' '))
  return out
}

/**
 * Jaccard similarity over 5-word shingles. Catches the reworded case that a
 * verbatim scan misses: two paragraphs that say the same thing in mostly the
 * same words with the city name swapped.
 */
export function shingleSimilarity(a: string, b: string, k = 5): number {
  const sa = shingles(a, k)
  const sb = shingles(b, k)
  if (sa.size === 0 || sb.size === 0) return 0
  let shared = 0
  for (const s of sa) if (sb.has(s)) shared++
  return shared / (sa.size + sb.size - shared)
}

/* ──────────────────────────────────────────────────────────────────────────
 * The gate
 * ────────────────────────────────────────────────────────────────────────── */

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

/**
 * Slots that are ALLOWED to be identical across cities.
 *
 * Hero paragraphs 4 and 5 are one sentence each — a call to action and a
 * request for a quote. They cannot be meaningfully varied, and pretending
 * otherwise produces worse copy, not less duplication. Treat them as fixed
 * brand lines: exempt them deliberately here, and give them a spec rather than
 * a structural example in buildFrontPrompt so the model is not being asked for
 * something impossible.
 *
 * Nothing else belongs in this set. An exemption is a decision, not a way to
 * quiet a failing check.
 */
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

/**
 * Check one city's generated copy against every already-published city, and
 * against itself for sibling area pages.
 *
 * Returns findings rather than throwing: the admin review screen should show
 * an operator what collided and where, not a stack trace. publishCity() is the
 * right place to refuse on a non-empty result.
 */
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
