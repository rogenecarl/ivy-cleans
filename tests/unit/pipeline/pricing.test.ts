import { describe, expect, it } from 'vitest'
import { addUsage, costUsd } from '@/server/pipeline/pricing'
import { usageFrom } from '@/server/pipeline/model'

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
    const once = addUsage(undefined, { 'claude-opus-5': { calls: 1, inputTokens: 10, outputTokens: 20, cacheWriteTokens: 0, cacheReadTokens: 0, searches: 0 } })
    const twice = addUsage(once, {
      'claude-opus-5': { calls: 1, inputTokens: 1, outputTokens: 2, cacheWriteTokens: 0, cacheReadTokens: 0, searches: 0 },
      'claude-haiku-5-5': { calls: 1, inputTokens: 3, outputTokens: 4, cacheWriteTokens: 0, cacheReadTokens: 0, searches: 2 },
    })
    expect(twice).toEqual({
      'claude-opus-5': { inputTokens: 11, outputTokens: 22, cacheWriteTokens: 0, cacheReadTokens: 0, searches: 0 },
      'claude-haiku-5-5': { inputTokens: 3, outputTokens: 4, cacheWriteTokens: 0, cacheReadTokens: 0, searches: 2 },
    })
  })

  it('prices cache writes at 1.25x, cache reads at 0.1x input, and web searches at $10 per thousand', () => {
    expect(
      costUsd({ 'claude-opus-5': { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 1_000_000, cacheReadTokens: 1_000_000, searches: 100 } }),
    ).toBeCloseTo(5 * 1.25 + 5 * 0.1 + 1)
  })

  it('reads every billed part of a response', () => {
    expect(
      usageFrom({
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_creation_input_tokens: 30,
          cache_read_input_tokens: 40,
          server_tool_use: { web_search_requests: 3 },
        },
      }),
    ).toEqual({ inputTokens: 10, outputTokens: 20, cacheWriteTokens: 30, cacheReadTokens: 40, searches: 3 })
  })
})
