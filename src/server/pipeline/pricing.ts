// What a city's generation cost: token usage recorded per draft, priced per model (USD per million tokens). Cache
// writes bill at 1.25x input, cache reads at 0.1x, and each web search at $10 per thousand.
import type { UsageTally } from './model'

type Usage = { inputTokens: number; outputTokens: number; cacheWriteTokens?: number; cacheReadTokens?: number; searches?: number }

export type ModelUsage = Record<string, Usage>

const PER_MILLION: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
}

const PER_SEARCH = 10 / 1000

export function addUsage(stored: ModelUsage | undefined, tally: UsageTally['byModel']): ModelUsage {
  const out: ModelUsage = { ...(stored ?? {}) }
  for (const [model, t] of Object.entries(tally)) {
    const prev = out[model] ?? { inputTokens: 0, outputTokens: 0 }
    out[model] = {
      inputTokens: prev.inputTokens + t.inputTokens,
      outputTokens: prev.outputTokens + t.outputTokens,
      cacheWriteTokens: (prev.cacheWriteTokens ?? 0) + (t.cacheWriteTokens ?? 0),
      cacheReadTokens: (prev.cacheReadTokens ?? 0) + (t.cacheReadTokens ?? 0),
      searches: (prev.searches ?? 0) + (t.searches ?? 0),
    }
  }
  return out
}

/** null = nothing was ever recorded (a city generated before costs were kept); an unknown model's tokens count as 0. */
export function costUsd(usage: ModelUsage | undefined): number | null {
  if (usage === undefined) return null
  let total = 0
  for (const [model, u] of Object.entries(usage)) {
    total += (u.searches ?? 0) * PER_SEARCH
    const price = PER_MILLION[model]
    if (!price) continue
    const input = u.inputTokens + 1.25 * (u.cacheWriteTokens ?? 0) + 0.1 * (u.cacheReadTokens ?? 0)
    total += (input * price.input + u.outputTokens * price.output) / 1_000_000
  }
  return total
}
