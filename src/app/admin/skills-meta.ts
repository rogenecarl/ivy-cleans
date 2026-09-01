/**
 * Display metadata for the generation stages, keyed by StageId
 * (src/pipeline/stages.ts STAGE_IDS). Framing the progress screen as named
 * "skills" rather than a bare stage list — icon, name, tagline — the
 * activity feed (Task 4) renders per card.
 *
 * The "Local Area Writer" ('home') card is retired along with the home stage
 * (Task 10): it wrote two sentences that were byte-identical across every
 * Ivy Cleans site apart from the city name, and the landmark half of it never
 * earned a click. ZIPs still render, as a plain list, with no model call and
 * so no skill card of their own.
 *
 * Client-safe on purpose: zero imports, so it can be pulled straight into
 * the 'use client' StageRunner without dragging any server-only module
 * (src/pipeline/stages.ts reaches the filesystem) into the browser bundle.
 */
export const SKILL_META: Record<string, { icon: string; name: string; tagline: string }> = {
  research: {
    icon: '🔎',
    name: 'City Research',
    tagline: 'Deep web search — suburbs, subdivisions, ZIP codes, local search phrases',
  },
  front: {
    icon: '✍️',
    name: 'Front-Page Copywriter',
    tagline: 'Hero and services copy, locked to the approved slots',
  },
  deep: {
    icon: '🫧',
    name: 'Deep-Clean Copywriter',
    tagline: 'The “what is deep cleaning” explainer with a local angle',
  },
}
