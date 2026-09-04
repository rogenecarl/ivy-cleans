/**
 * The ModelClient seam: everything the pipeline stages need from Claude,
 * behind an interface small enough to stub. `AnthropicModelClient` is the
 * real thing (never constructed in tests — see tests/model.test.ts);
 * `StubModelClient` returns canned data validated through the same zod
 * schemas so stubs can't silently diverge from what the real client would
 * have to produce. `makeClient()` picks between them at call time based on
 * `STUB_MODEL`.
 */

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
}

/** A single unit of research-call activity, surfaced to callers for a live progress feed. */
export type ResearchEvent = { kind: 'search' | 'reading'; label: string }

export interface ModelClient {
  /** Web-grounded research call (server tool). Returns raw findings text. */
  research(prompt: string, key: string, onEvent?: (event: ResearchEvent) => void): Promise<string>
  /** Schema-validated structured generation. */
  generate<T>(args: GenerateArgs<T>): Promise<T>
  /**
   * Running token tally for this client instance.
   *
   * Generating one city is ~16 calls and the suburb stage scales with the
   * area count, so "what does a city cost" is a question with an operational
   * answer rather than an estimate — and at a hundred sites it is the
   * difference between a budget and a guess. The SDK hands back `usage` on
   * every response and this used to drop it on the floor.
   */
  readonly usage: UsageTally
}

export interface UsageTally {
  calls: number
  inputTokens: number
  outputTokens: number
}

const MODEL = 'claude-opus-5'

const RESEARCH_SYSTEM =
  'You are a local-market researcher for a residential cleaning company. ' +
  'Ground every claim in the web_search results — never invent suburbs, subdivisions, or zip codes.'

/** Shared refusal → Error mapping for both calls below. */
function refusalError(stopDetails: { category: string | null } | null): Error {
  const category = stopDetails?.category ?? 'unknown'
  return new Error(`Claude declined this request (category ${category}) — retry or adjust the notes`)
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
    // No `thinking` param: on by default (adaptive) on claude-opus-5 — omitting
    // it is the recommended way to get adaptive thinking, not "no thinking".
    // No `temperature`: sampling params are rejected on claude-opus-5.
    // fallbacks: 'default' + the server-side-fallback beta reroutes classifier
    // declines to Anthropic's recommended fallback by refusal category, so a
    // benign notes field that trips a classifier doesn't just dead-end.
    const stream = this.client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      system: args.system,
      output_config: {
        // @ts-expect-error SDK typings lag: the installed @anthropic-ai/sdk's
        // zodOutputFormat() accepts only the schema (no second "key"/"name"
        // argument, and BetaJSONOutputFormat carries no name field either) —
        // the plan's two-arg call isn't accepted by this SDK version. `key`
        // is still meaningful elsewhere (StubModelClient's canned-data
        // lookup), just not to this helper, so it's passed through here for
        // forward-compatibility and silenced rather than dropped.
        format: zodOutputFormat(args.schema, args.key),
      },
      messages: [{ role: 'user', content: args.prompt }],
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    })
    const message = await stream.finalMessage()
    this.count(message)
    if (message.stop_reason === 'refusal') {
      throw refusalError(message.stop_details)
    }
    const text = concatText(message.content)
    return args.schema.parse(JSON.parse(text))
  }

  async research(prompt: string, key: string, onEvent?: (event: ResearchEvent) => void): Promise<string> {
    void key // reserved for future correlation/telemetry; the stub uses it to look up canned findings
    // Web-grounded research is a separate call from the structured writer: server
    // tools (web_search) and output_config (structured outputs) are kept apart
    // by design, so this call carries `tools` and no `output_config`.
    const stream = this.client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      system: RESEARCH_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8 }],
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    })
    if (onEvent) {
      // Verified against the installed SDK (@anthropic-ai/sdk 0.116.0)
      // node_modules/@anthropic-ai/sdk/lib/BetaMessageStream.d.ts:8 — the
      // 'streamEvent' event name and its BetaRawMessageStreamEvent payload.
      // node_modules/@anthropic-ai/sdk/resources/beta/messages/messages.d.ts:
      //   1777 BetaRawContentBlockStartEvent { content_block, index, type: 'content_block_start' }
      //   2046 BetaServerToolUseBlock { type: 'server_tool_use', ... }
      //   3399 BetaWebSearchToolResultBlock { type: 'web_search_tool_result', ... }
      //   1772 BetaRawContentBlockDeltaEvent { delta, index, type: 'content_block_delta' }
      //   1266 BetaInputJSONDelta { partial_json, type: 'input_json_delta' }
      //   1785 BetaRawContentBlockStopEvent { index, type: 'content_block_stop' }
      // Accepted limitation: this mapping is exercised only by these types +
      // the next live run — tests cover the stub path only, per the no-live-API rule.
      const toolInputs = new Map<number, string>()
      stream.on('streamEvent', (event) => {
        // Event-handler errors must never kill the research call.
        try {
          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'server_tool_use') toolInputs.set(event.index, '')
            else if (event.content_block.type === 'web_search_tool_result')
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
            let label = 'Searching the web…'
            try {
              const query = (JSON.parse(raw) as { query?: unknown }).query
              if (typeof query === 'string' && query.trim() !== '') label = `Searching: ${query}`
            } catch {
              /* partial json — keep the generic label */
            }
            onEvent({ kind: 'search', label })
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
    if (!(args.key in this.fixtures.generated)) {
      throw new Error(`StubModelClient has no canned generated output for key "${args.key}"`)
    }
    return args.schema.parse(this.fixtures.generated[args.key])
  }
}

/**
 * Stub fixture shape loaded by makeClient() — matches StubModelClient's
 * constructor argument. The fixture file itself (tests/fixtures/stub-pipeline.json)
 * arrives in Task 4; this function reads it lazily (only when STUB_MODEL=1 is
 * actually set) so its absence is harmless until stub mode is exercised.
 */
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
