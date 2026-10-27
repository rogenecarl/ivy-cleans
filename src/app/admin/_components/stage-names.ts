// Short stage names for the generate screen's step list. STAGES[].label (slots.ts) keeps the full sentence for the regenerate panel.
export const STAGE_NAMES: Record<string, string> = {
  research: 'Research',
  front: 'Front page',
  suburb: 'Area pages',
  service: 'Service pages',
}

// rough duration shown next to a stage that hasn't started, so slow doesn't read as stuck. Deliberately vague.
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
