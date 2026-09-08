/*
 * Meta descriptions from generated copy — Abdi's Orlando review, item 9.
 *
 * Every page used to carry a template description: the front page's was the
 * OLD Minneapolis hero truncated mid-word ("…Our experienced"), under a hero
 * that had been rewritten; every area page's was one sentence with the area
 * name swapped in. The generated copy on the same page is a better snippet
 * and costs nothing to reuse, so descriptions are now cut from it here.
 *
 * Google shows roughly 155 characters of a description before truncating,
 * and cutting mid-word is what the old front-page one did. So: whole
 * sentences while they fit, and if the very first sentence is already too
 * long, a clean cut at a word boundary with an ellipsis.
 */
export const META_DESCRIPTION_MAX = 155

/*
 * Sentence ends are [.!?] followed by whitespace, EXCEPT after the
 * abbreviations that turn up in place names and copy — "St. Louis Park" is a
 * Minneapolis area, and "Dr." and "Mt." are common enough in addresses.
 */
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
