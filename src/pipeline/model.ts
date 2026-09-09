// The ModelClient seam: AnthropicModelClient for real, StubModelClient for tests; makeClient() picks by STUB_MODEL.

import fs from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

export type GenerateArgs<T> = {
  schema: z.ZodType<T>
  system: string
  prompt: string
  key: string
  /** defaults to the writing model */
  model?: string
}

// Research is transcription (find pages, copy names out) and runs on the cheaper model; every sentence a reader
// sees is written by the writing model.
export const MODELS = { writing: 'claude-opus-5', research: 'claude-sonnet-5' } as const

// Web searches per research pass. Research is three small passes (city-wide, the area list, one per area) rather
// than one long call: each pass gets its own budget so none starves another, and search results never pile up.
export const SEARCH_BUDGET = { metro: 4, areas: 3, area: 3 } as const

export type ResearchOptions = { maxSearches: number }

export type ResearchEvent = { kind: 'search' | 'reading'; label: string }

// the search query from a server_tool_use block, in either stream shape (parsed object or accumulated JSON text)
export function searchQuery(input: unknown): string | null {
  let value: unknown = input
  if (typeof input === 'string') {
    if (input.trim() === '') return null
    try {
      value = JSON.parse(input)
    } catch {
      // A content_block_stop can arrive before the fragments finish.
      return null
    }
  }
  if (value === null || typeof value !== 'object') return null
  const query = (value as { query?: unknown }).query
  if (typeof query !== 'string') return null
  const trimmed = query.trim()
  return trimmed === '' ? null : trimmed
}

export interface ModelClient {
  /** Web-grounded research call (server tool). Returns raw findings text. */
  research(
    prompt: string,
    key: string,
    onEvent?: (event: ResearchEvent) => void,
    options?: ResearchOptions
  ): Promise<string>
  /** Schema-validated structured generation. */
  generate<T>(args: GenerateArgs<T>): Promise<T>
  // running token tally for this client instance
  readonly usage: UsageTally
}

export interface UsageTally {
  calls: number
  inputTokens: number
  outputTokens: number
}

const RESEARCH_SYSTEM =
  'You are a local-market researcher for a residential cleaning company. ' +
  'Ground every claim in the web_search results — never invent suburbs, subdivisions, or zip codes.'

// server-side fallback reroutes classifier declines; Opus only — Sonnet 5 rejects the parameter
function fallbackFor(model: string): { betas?: string[]; fallbacks?: 'default' } {
  return model === MODELS.writing ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}
}

/** Shared refusal → Error mapping for both calls below. */
function refusalError(stopDetails: { category: string | null } | null): Error {
  const category = stopDetails?.category ?? 'unknown'
  return new Error(`Claude declined this request (category ${category}) — retry, or adjust the market facts it was given`)
}

/** Concatenate the text blocks of a finished (non-streaming-consumer) message. */
function concatText(content: Array<{ type: string; text?: string }>): string {
  let text = ''
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string') text += block.text
  }
  return text
}

export class AnthropicModelClient implements ModelClient {
  private readonly client: Anthropic
  readonly usage: UsageTally = { calls: 0, inputTokens: 0, outputTokens: 0 }

  /** Fold one response's usage into the running tally. */
  private count(message: { usage?: { input_tokens?: number; output_tokens?: number } }): void {
    this.usage.calls += 1
    this.usage.inputTokens += message.usage?.input_tokens ?? 0
    this.usage.outputTokens += message.usage?.output_tokens ?? 0
  }

  constructor(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) {
      throw new Error(
        'AnthropicModelClient requires an API key: set ANTHROPIC_API_KEY in .env.local, or pass one explicitly to the constructor.'
      )
    }
    this.client = new Anthropic({ apiKey })
  }

  async generate<T>(args: GenerateArgs<T>): Promise<T> {
    // no `thinking` (adaptive by default on claude-opus-5), no `temperature` (rejected); fallbacks reroute classifier declines
    const stream = this.client.beta.messages.stream({
      model: args.model ?? MODELS.writing,
      max_tokens: 64000,
      system: args.system,
      output_config: {
        // @ts-expect-error the installed SDK's zodOutputFormat() takes only the schema; `key` kept for the stub lookup
        format: zodOutputFormat(args.schema, args.key),
      },
      messages: [{ role: 'user', content: args.prompt }],
      ...fallbackFor(args.model ?? MODELS.writing),
    })
    const message = await stream.finalMessage()
    this.count(message)
    if (message.stop_reason === 'refusal') {
      throw refusalError(message.stop_details)
    }
    const text = concatText(message.content)
    return args.schema.parse(JSON.parse(text))
  }

  async research(
    prompt: string,
    key: string,
    onEvent?: (event: ResearchEvent) => void,
    options: ResearchOptions = { maxSearches: SEARCH_BUDGET.area }
  ): Promise<string> {
    void key // the stub uses it to look up canned findings
    // research: server tools without output_config; structured writing is a separate call
    const stream = this.client.beta.messages.stream({
      model: MODELS.research,
      max_tokens: 32000,
      system: RESEARCH_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: options.maxSearches }],
      // one search per turn: a burst of parallel searches past max_uses gets the whole batch rejected
      tool_choice: { type: 'auto', disable_parallel_tool_use: true },
      ...fallbackFor(MODELS.research),
    })
    if (onEvent) {
      // event shapes per @anthropic-ai/sdk 0.116.0 BetaRawMessageStreamEvent; exercised only by live runs
      const toolInputs = new Map<number, string>()
      stream.on('streamEvent', (event) => {
        // Event-handler errors must never kill the research call.
        try {
          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'server_tool_use') {
              // the query can be complete here; emit and stop tracking so the stop handler doesn't emit twice
              const query = searchQuery((event.content_block as { input?: unknown }).input)
              if (query !== null) onEvent({ kind: 'search', label: `Searching: ${query}` })
              else toolInputs.set(event.index, '')
            } else if (event.content_block.type === 'web_search_tool_result')
              onEvent({ kind: 'reading', label: 'Reading search results…' })
          } else if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'input_json_delta' &&
            toolInputs.has(event.index)
          ) {
            toolInputs.set(event.index, toolInputs.get(event.index)! + event.delta.partial_json)
          } else if (event.type === 'content_block_stop' && toolInputs.has(event.index)) {
            const raw = toolInputs.get(event.index)!
            toolInputs.delete(event.index)
            const query = searchQuery(raw)
            onEvent({ kind: 'search', label: query === null ? 'Searching the web…' : `Searching: ${query}` })
          }
        } catch {
          /* swallow — a broken event handler must never kill the research call */
        }
      })
    }
    const message = await stream.finalMessage()
    this.count(message)
    if (message.stop_reason === 'refusal') {
      throw refusalError(message.stop_details)
    }
    return concatText(message.content)
  }
}

export class StubModelClient implements ModelClient {
  /** Calls are counted; tokens stay zero because the stub spends nothing. */
  readonly usage: UsageTally = { calls: 0, inputTokens: 0, outputTokens: 0 }

  constructor(
    private readonly fixtures: {
      research: Record<string, string>
      generated: Record<string, unknown>
      events?: Record<string, ResearchEvent[]>
    }
  ) {}

  async research(prompt: string, key: string, onEvent?: (event: ResearchEvent) => void): Promise<string> {
    void prompt
    this.usage.calls += 1
    const value = this.fixtures.research[key]
    if (value === undefined) {
      throw new Error(`StubModelClient has no canned research for key "${key}"`)
    }
    if (onEvent) {
      for (const event of this.fixtures.events?.[key] ?? []) onEvent(event)
    }
    return value
  }

  async generate<T>(args: GenerateArgs<T>): Promise<T> {
    // counted even though the stub spends nothing: tests assert a resumed stage doesn't pay twice
    this.usage.calls += 1
    if (!(args.key in this.fixtures.generated)) {
      throw new Error(`StubModelClient has no canned generated output for key "${args.key}"`)
    }
    return args.schema.parse(this.fixtures.generated[args.key])
  }
}

// stub fixture (tests/fixtures/stub-pipeline.json), read lazily when STUB_MODEL=1
type StubFixtures = {
  research: Record<string, string>
  generated: Record<string, unknown>
  events?: Record<string, ResearchEvent[]>
}

export function makeClient(): ModelClient {
  if (process.env.STUB_MODEL === '1') {
    const fixturePath = path.join(process.cwd(), 'tests/fixtures/stub-pipeline.json')
    const raw = fs.readFileSync(fixturePath, 'utf-8')
    const fixtures = JSON.parse(raw) as StubFixtures
    return new StubModelClient(fixtures)
  }
  return new AnthropicModelClient()
}
