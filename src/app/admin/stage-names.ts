/*
 * Short names for the pipeline stages, for the generate screen's step list.
 *
 * REPLACED skills-meta.ts, which gave each stage a persona ("Front-Page
 * Copywriter"), an emoji, and a marketing tagline. Those were three problems:
 * the pipeline is five steps, not a cast of characters; the emoji had already
 * become dead code once lucide icons took precedence over them; and a tagline
 * explaining what "Research" does is copy an operator reads once and then
 * scrolls past forever.
 *
 * STAGES[].label (src/content/slots.ts) stays as it is — a full sentence is
 * right in the regenerate panel, where a stage is picked from a list without
 * the surrounding context this screen provides. These are the terse forms for
 * a step list, where the row's position already says what it is.
 */
export const STAGE_NAMES: Record<string, string> = {
  research: 'Research',
  front: 'Front page',
  suburb: 'Area pages',
  service: 'Service pages',
}

/**
 * Roughly how long each stage runs, shown next to a stage that has not
 * started yet.
 *
 * Not decoration. Research is ~3 minutes of web search — measured at 4.6 on a
 * real Orlando run — and it is the FIRST thing an operator sees. Without a
 * number to compare against, two minutes of one spinner is indistinguishable
 * from a hang, and the honest response to that is to tell them what to expect
 * rather than to animate harder.
 *
 * Deliberately vague ("~3 min", not "2:58"): these vary with how much the
 * search finds and how many areas survive the uniqueness gate, and a precise
 * estimate that is wrong is worse than a rough one that is right.
 */
export const STAGE_EXPECTED: Record<string, string> = {
  research: '~3 min',
  front: '~30s',
  suburb: '~20s each',
  service: '~10s each',
}

/** Falls back to the stage's own label, so an unmapped stage still renders. */
export function stageName(id: string, label: string): string {
  return STAGE_NAMES[id] ?? label
}
