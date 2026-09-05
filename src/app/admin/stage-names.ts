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
  deep: 'Deep cleaning',
  suburb: 'Area pages',
  service: 'Service pages',
}

/** Falls back to the stage's own label, so an unmapped stage still renders. */
export function stageName(id: string, label: string): string {
  return STAGE_NAMES[id] ?? label
}
