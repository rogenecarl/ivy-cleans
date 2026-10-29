// Shared fixtures and helpers for the pipeline suites: one stub city, one counting client.
import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { createDraft } from '@/server/content/drafts'
import { deriveFacts, type Facts } from '@/server/pipeline/facts'
import { revalidateCity } from '@/server/content/store'
import { StubModelClient, type GenerateArgs, type ModelClient, type ResearchEvent } from '@/server/pipeline/model'
import type { ResearchResult } from '@/server/pipeline/sources'
import { toResearchAndClaims } from '@/server/pipeline/claims'
import type { ResearchStructured } from '@/server/pipeline/schemas'
import { STAGES } from '@/server/pipeline/stages'
import { type ResearchOutput } from '@/server/pipeline/schemas'

export const CONTENT_DIR = path.join(process.cwd(), 'content')

export const DRAFTS_DIR = path.join(CONTENT_DIR, '_drafts')

export const CITIES_JSON = path.join(CONTENT_DIR, '_cities.json')

export const DOMAINS_JSON = path.join(CONTENT_DIR, '_domains.json')

export const FIXTURE_PATH = path.join(process.cwd(), 'tests/fixtures/stub-pipeline.json')

export const KEY = 'ztest-stubville'

// executeStage's 'suburb' case is Task 16's work (see stages/run.ts) — until it
// lands, "run every stage" in these fixtures means every stage that actually
// generates something. STAGES itself still lists all four; this is only
// about which ones the stub client can be asked to run end to end.
/*
 * The single-call stages. `suburb` and `service` are the two that make N model
 * calls, are resumable inside themselves, and are driven one item per request
 * by the admin — each has its own describe below. Excluding them here keeps
 * "calls the model once per stage" meaning exactly what it says.
 */
export const RUNNABLE_STAGES = STAGES.filter((s) => s.id !== 'verify' && s.id !== 'suburb' && s.id !== 'service')

export function draftPath(key: string): string {
  return path.join(DRAFTS_DIR, `${key}.json`)
}

export function cityPath(key: string): string {
  return path.join(CONTENT_DIR, `${key}.json`)
}

export function progressPath(key: string): string {
  return path.join(DRAFTS_DIR, `${key}.progress.json`)
}

export type StubFixtures = { research: Record<string, string>; generated: Record<string, unknown> }

export let fixtures: StubFixtures

/** StubModelClient wrapper that records every call, so resume can be proven. */
export class CountingClient implements ModelClient {
  readonly calls: string[] = []
  /** Delegates the tally so the wrapper reports what the wrapped client spent. */
  get usage() {
    return this.inner.usage
  }
  constructor(private readonly inner: ModelClient) {}

  async research(prompt: string, key: string, onEvent?: (event: ResearchEvent) => void): Promise<ResearchResult> {
    this.calls.push(`research:${key}`)
    return this.inner.research(prompt, key, onEvent)
  }

  async generate<T>(args: GenerateArgs<T>): Promise<T> {
    this.calls.push(`generate:${args.key}`)
    return this.inner.generate(args)
  }
}

export function newClient(): CountingClient {
  return new CountingClient(new StubModelClient(fixtures))
}

export function stubFacts(): Facts {
  return deriveFacts({
    city: 'Ztest Stubville',
    state: 'MN',
    phoneDigits: '6125550142',
    address: '1 Fixture Way',
  })
}

/** research.structure canned output, used by the prompt-builder unit tests. */
export function fixtureResearch(): ResearchOutput {
  return toResearchAndClaims(fixtures.generated['research.structure'] as ResearchStructured, new Set(['S1'])).research
}

export async function resetDraft(): Promise<void> {
  await rm(draftPath(KEY), { force: true })
  await rm(cityPath(KEY), { force: true })
  await rm(progressPath(KEY), { force: true })
  revalidateCity(KEY)
  await createDraft(stubFacts())
}

/** Loads the stub fixtures every suite in this folder reads; call from beforeAll. */
export async function loadFixtures(): Promise<void> {
  fixtures = JSON.parse(await readFile(FIXTURE_PATH, 'utf-8')) as StubFixtures
}
