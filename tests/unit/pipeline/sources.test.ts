import { describe, expect, it } from 'vitest'
import { mergeSources } from '@/server/pipeline/sources'
import { citationsToResult } from '@/server/pipeline/model'
import { composeFindings } from '@/server/pipeline/stages'

describe('mergeSources', () => {
  it('gives one id per URL across passes and rewrites every marker to it', () => {
    const merged = mergeSources({
      metro: { text: 'Humid summers [1].', sources: [{ id: '1', url: 'https://a.example/x', title: 'A', quotes: ['humid'] }] },
      areas: {
        text: 'Edina [2] and Hopkins [1].',
        sources: [
          { id: '1', url: 'https://b.example/y', title: 'B', quotes: ['Hopkins'] },
          { id: '2', url: 'https://a.example/x', title: 'A again', quotes: ['humid', 'Edina'] },
        ],
      },
    })
    expect(merged.sources).toEqual([
      { id: 'S1', url: 'https://a.example/x', title: 'A', quotes: ['humid', 'Edina'] },
      { id: 'S2', url: 'https://b.example/y', title: 'B', quotes: ['Hopkins'] },
    ])
    expect(merged.texts.metro).toBe('Humid summers [S1].')
    expect(merged.texts.areas).toBe('Edina [S1] and Hopkins [S2].')
  })

  it('leaves a part with no sources unchanged', () => {
    const merged = mergeSources({ metro: { text: 'Plain text [1] stays.', sources: [] } })
    expect(merged.texts.metro).toBe('Plain text [1] stays.')
    expect(merged.sources).toEqual([])
  })
})

describe('composeFindings', () => {
  const parts = { metro: 'M', areas: 'A', perArea: { Edina: 'E' } }

  it('is unchanged when there are no sources', () => {
    expect(composeFindings(parts, [])).toBe(
      '# (c) part 1 — CITY-WIDE HOUSING AND CONDITIONS\nM\n\n# (a) AREAS\nA\n\n# (b) and (c) part 2 — PER AREA: subdivisions, housing, conditions\n## Edina\nE',
    )
  })

  it('appends a SOURCES section with each source and its quotes', () => {
    const out = composeFindings(parts, [{ id: 'S1', url: 'https://a.example/x', title: 'A page', quotes: ['quoted line'] }])
    expect(out).toMatch(/\n\n# SOURCES\nS1 · A page · https:\/\/a\.example\/x\n {2}"quoted line"$/)
  })
})

describe('citationsToResult', () => {
  it('marks each cited text block and collects its sources', () => {
    const result = citationsToResult([
      { type: 'text', text: 'Edina has ' },
      {
        type: 'text',
        text: 'Morningside',
        citations: [{ type: 'web_search_result_location', url: 'https://a.example/x', title: 'A', cited_text: 'Morningside is in Edina' }],
      },
      { type: 'server_tool_use' },
      { type: 'text', text: '.' },
    ])
    expect(result.text).toBe('Edina has Morningside [1].')
    expect(result.sources).toEqual([{ id: '1', url: 'https://a.example/x', title: 'A', quotes: ['Morningside is in Edina'] }])
  })

  it('reuses a source number for a URL cited twice', () => {
    const cite = { type: 'web_search_result_location', url: 'https://a.example/x', title: 'A', cited_text: 'q2' }
    const result = citationsToResult([
      { type: 'text', text: 'one', citations: [{ ...cite, cited_text: 'q1' }] },
      { type: 'text', text: ' two', citations: [cite] },
    ])
    expect(result.text).toBe('one [1] two [1]')
    expect(result.sources[0].quotes).toEqual(['q1', 'q2'])
  })
})
