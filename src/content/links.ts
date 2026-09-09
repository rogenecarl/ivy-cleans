import type { CityContent, SlotLink } from './types'
import { cityHref } from './interpolate'

// Links inside generated prose: the model picks a phrase it already wrote, code checks it and renders it.
export type Segment = string | { text: string; href: string }
export type LinkCandidate = { slot: string; anchor: string; href: string }

export const MIN_ANCHOR_WORDS = 3
export const MAX_ANCHOR_CHARS = 60
export const MAX_SUBURB_LINKS = 3
export const MAX_SERVICE_LINKS = 2

// keep a candidate only when its anchor sits verbatim in that slot's text; one link per target and per anchor, first wins
export function acceptLinks(
  candidates: readonly LinkCandidate[],
  textBySlot: Record<string, string | undefined>,
  cap: number,
): Record<string, SlotLink[]> {
  const out: Record<string, SlotLink[]> = {}
  const hrefs = new Set<string>()
  const anchors = new Set<string>()
  let kept = 0
  for (const candidate of candidates) {
    if (kept >= cap) break
    const anchor = candidate.anchor.trim()
    const text = textBySlot[candidate.slot]
    if (text === undefined) continue
    if (anchor.split(/\s+/).length < MIN_ANCHOR_WORDS || anchor.length > MAX_ANCHOR_CHARS) continue
    if (!text.includes(anchor)) continue
    if (hrefs.has(candidate.href) || anchors.has(anchor.toLowerCase())) continue
    hrefs.add(candidate.href)
    anchors.add(anchor.toLowerCase())
    ;(out[candidate.slot] ??= []).push({ anchor, href: candidate.href })
    kept++
  }
  return out
}

/** A slot's stored links with hrefs pointed at this tenant. */
export function slotLinks(c: CityContent, slot: string): SlotLink[] {
  return (c.links?.[slot] ?? []).map((link) => ({ anchor: link.anchor, href: cityHref(c, link.href) }))
}

/** Text split around the first occurrence of each anchor, left to right, never overlapping. */
export function linkify(text: string, links: readonly SlotLink[]): Segment[] {
  const hits = links
    .map((link) => ({ ...link, at: text.indexOf(link.anchor) }))
    .filter((hit) => hit.at >= 0)
    .sort((a, b) => a.at - b.at)
  const out: Segment[] = []
  let pos = 0
  for (const hit of hits) {
    if (hit.at < pos) continue
    if (hit.at > pos) out.push(text.slice(pos, hit.at))
    out.push({ text: hit.anchor, href: hit.href })
    pos = hit.at + hit.anchor.length
  }
  if (pos < text.length) out.push(text.slice(pos))
  return out
}
