import { normalizeWords } from './html'

const SHINGLE = 5
/** Jaccard overlap of 5-word shingles above which two posts count as the same article. */
export const DUPLICATE_THRESHOLD = 0.15

function shingles(text: string): Set<string> {
  const words = normalizeWords(text).split(' ').filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + SHINGLE <= words.length; i++) out.add(words.slice(i, i + SHINGLE).join(' '))
  return out
}

export function similarity(a: string, b: string): number {
  const sa = shingles(a)
  const sb = shingles(b)
  if (!sa.size || !sb.size) return 0
  let shared = 0
  for (const s of sa) if (sb.has(s)) shared++
  return shared / (sa.size + sb.size - shared)
}

export type Candidate = { cityKey: string; slug: string; title: string; text: string }

/** The closest existing post when the new one duplicates it, else null. Same title on another site also counts. */
export function findDuplicate(title: string, text: string, others: Candidate[]): { match: Candidate; score: number } | null {
  let best: { match: Candidate; score: number } | null = null
  for (const other of others) {
    if (normalizeWords(other.title) === normalizeWords(title)) return { match: other, score: 1 }
    const score = similarity(text, other.text)
    if (score >= DUPLICATE_THRESHOLD && (best === null || score > best.score)) best = { match: other, score }
  }
  return best
}
