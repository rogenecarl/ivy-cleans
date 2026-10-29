import { describe, expect, it } from 'vitest'
import { addUsage, costUsd } from '@/server/pipeline/pricing'

describe('pricing', () => {
  it('prices a million tokens in and out per model', () => {
    expect(costUsd({ 'claude-opus-5': { inputTokens: 1_000_000, outputTokens: 1_000_000 } })).toBe(30)
    expect(costUsd({ 'claude-sonnet-5': { inputTokens: 1_000_000, outputTokens: 1_000_000 } })).toBe(12)
    expect(costUsd({ 'claude-haiku-5-5': { inputTokens: 1_000_000, outputTokens: 1_000_000 } })).toBeCloseTo(0.6)
  })

  it('has no cost for a draft that never recorded usage, and zero for one that spent nothing', () => {
    expect(costUsd(undefined)).toBeNull()
    expect(costUsd({})).toBe(0)
  })

  it('treats an unknown model as free rather than failing', () => {
    expect(costUsd({ 'some-new-model': { inputTokens: 5, outputTokens: 5 } })).toBe(0)
  })

  it('adds a request tally into the stored usage, per model', () => {
    const once = addUsage(undefined, { 'claude-opus-5': { calls: 1, inputTokens: 10, outputTokens: 20 } })
    const twice = addUsage(once, {
      'claude-opus-5': { calls: 1, inputTokens: 1, outputTokens: 2 },
      'claude-haiku-5-5': { calls: 1, inputTokens: 3, outputTokens: 4 },
    })
    expect(twice).toEqual({
      'claude-opus-5': { inputTokens: 11, outputTokens: 22 },
      'claude-haiku-5-5': { inputTokens: 3, outputTokens: 4 },
    })
  })
})
