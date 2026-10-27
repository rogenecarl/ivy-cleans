// Meta descriptions cut from generated copy: whole sentences while they fit in ~155 chars, else a word-boundary cut with an ellipsis.
export const META_DESCRIPTION_MAX = 155

// sentence ends at [.!?] + whitespace, except after abbreviations ("St. Louis Park")
const ABBREVIATIONS = /\b(?:St|Mt|Ft|Dr|Mr|Mrs|Ms|No|vs|Ste|Ave|Blvd)\.$/

function sentences(text: string): string[] {
  const out: string[] = []
  let current = ''
  for (const piece of text.split(/(?<=[.!?])\s+/)) {
    current = current ? `${current} ${piece}` : piece
    if (ABBREVIATIONS.test(current)) continue
    out.push(current)
    current = ''
  }
  if (current) out.push(current)
  return out
}

export function metaDescription(text: string, max = META_DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean

  let out = ''
  for (const sentence of sentences(clean)) {
    const next = out ? `${out} ${sentence}` : sentence
    if (next.length > max) break
    out = next
  }
  if (out) return out

  // The first sentence alone is over the limit: cut at the last word boundary
  // that leaves room for the ellipsis, and never end on punctuation.
  const cut = clean.slice(0, max - 1)
  const boundary = cut.lastIndexOf(' ')
  return `${cut.slice(0, boundary > 0 ? boundary : cut.length).replace(/[,;:\-–—]+$/, '')}…`
}
