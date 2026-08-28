/**
 * Display metadata for the four generation stages, keyed by StageId
 * (src/pipeline/stages.ts STAGE_IDS). Framing the progress screen as four
 * named "skills" rather than a bare stage list — icon, name, tagline — the
 * activity feed (Task 4) renders per card.
 *
 * Client-safe on purpose: zero imports, so it can be pulled straight into
 * the 'use client' StageRunner without dragging any server-only module
 * (src/pipeline/stages.ts reaches the filesystem) into the browser bundle.
 */
export const SKILL_META: Record<string, { icon: string; name: string; tagline: string }> = {
  research: {
    icon: '🔎',
    name: 'City Research',
    tagline: 'Deep web search — suburbs, ZIP codes, landmarks, local search phrases',
  },
  front: {
    icon: '✍️',
    name: 'Front-Page Copywriter',
    tagline: 'Hero and services copy, locked to the approved slots',
  },
  home: {
    icon: '📍',
    name: 'Local Area Writer',
    tagline: 'ZIP and landmark sentences from researched data only — nothing invented',
  },
  deep: {
    icon: '🫧',
    name: 'Deep-Clean Copywriter',
    tagline: 'The “what is deep cleaning” explainer with a local angle',
  },
}
