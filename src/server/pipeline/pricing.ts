// What a city's generation actually cost: token usage recorded per draft, priced per model (USD per million tokens).
import type { UsageTally } from './model'

export type ModelUsage = Record<string, { inputTokens: number; outputTokens: number }>

const PER_MILLION: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
}

export function addUsage(stored: ModelUsage | undefined, tally: UsageTally['byModel']): ModelUsage {
  const out: ModelUsage = { ...(stored ?? {}) }
  for (const [model, t] of Object.entries(tally)) {
    const prev = out[model] ?? { inputTokens: 0, outputTokens: 0 }
    out[model] = { inputTokens: prev.inputTokens + t.inputTokens, outputTokens: prev.outputTokens + t.outputTokens }
  }
  return out
}

/** null = nothing was ever recorded (a city generated before costs were kept); an unknown model counts as 0. */
export function costUsd(usage: ModelUsage | undefined): number | null {
  if (usage === undefined) return null
  let total = 0
  for (const [model, u] of Object.entries(usage)) {
    const price = PER_MILLION[model]
    if (price) total += (u.inputTokens * price.input + u.outputTokens * price.output) / 1_000_000
  }
  return total
}
