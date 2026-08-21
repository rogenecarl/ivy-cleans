# Admin Activity Feed + Skill Cards (Plan 4) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin generate screen *show the AI working*: each of the four stages becomes a named "skill card" with an icon and capability line, a live activity feed streams what the model is actually doing (web-search queries issued, results read, findings structured), and research results appear as chips (suburbs / ZIP counts / landmarks) the moment that stage lands — with zero change to the pipeline's behavior, gates, or the public site's HTML.

**Architecture:** A new framework-free progress log (`src/pipeline/progress.ts`) persists append-only events to `content/_drafts/<key>.progress.json` — a SEPARATE file from the draft sidecar, so mid-stage event flushes can never clobber the draft executeStage() holds in memory. `ModelClient.research()` gains an optional `onEvent` callback (Anthropic: mapped from streaming `server_tool_use` / `web_search_tool_result` blocks; Stub: canned events from the fixture). `stages.ts` emits stage start / found / done / error events and clears a stage's events on regenerate. The client polls a new `getProgressAction(key)` every ~1.2s purely for display — the existing sequential StageRunner remains the only driver of stage execution.

**Tech Stack:** No new dependencies. Next 16 server actions, existing vitest + stub model, existing Playwright E2E harness (`scripts/admin-e2e.mjs`, borrowed `PW_PATH`).

## Global Constraints

- **NO COMMITS. EVER.** Never `git commit` / `git add` in this repo. (Project rule; overrides any skill-template commit steps — plan tasks end at gates, not commits.)
- Never `--update` the pinned snapshots (`tests/data-equivalence.test.ts` sha256 `dd34c7831fcad475ad8d495ed689ad7b04ecae9ac32afab6012fc9ade34df9eb`, `tests/book-data.test.ts` `058bf52ab4f7a88aee37de3dd9934ad67ec7c6ba1f38f5894e27bf364f316e66`). New pins for NEW tests are allowed.
- No live API calls in any test or task. `StubModelClient` / `STUB_MODEL=1` only. Never construct `AnthropicModelClient` in tests (its no-key constructor throw IS tested).
- This is NOT the Next.js you know: read the relevant guide in `node_modules/next/dist/docs/` before writing any Next code; verify SDK usage against the installed `@anthropic-ai/sdk` 0.116.0 sources in `node_modules`, not memory.
- Ports: serve on **3100** only (`fuser -k 3100/tcp`; check `ss -lptn 'sport = :3100'` — lsof is unreliable in WSL). Port 3000 belongs to another project.
- Apostrophes in any user-visible copy must be the typographic ’ (U+2019), never `'` (lint enforces).
- `src/pipeline/*` and `src/content/*` stay framework-free: no `next/*` imports (tests import them in bare node).
- Admin UI renders inside the `[data-admin-root]` rem-ladder reset — admin font sizes are normal rem; do not copy site-side sizing conventions.
- Gates after EVERY task: `pnpm test` all green (pins byte-intact) + `pnpm exec tsc --noEmit` + `pnpm lint`. Task 4 adds `pnpm build` + crawler `node scripts/snapshot-pages.mjs compare` → must print `EQUIVALENT (11 routes)` (run against `pnpm start --port 3100`, NOT dev — dev-mode head links false-diff every route), + the full stub E2E.

## File structure

```
src/pipeline/
  progress.ts                ← NEW: ProgressEvent type + append/read/clear (serialized writes)
  model.ts                   ← research() gains onEvent; StubModelClient emits fixture events
  stages.ts                  ← executeStage/runStage/regenerateStage emit + clear events
  admin-logic.ts             ← getProgressLogic()
src/content/drafts.ts        ← listDrafts excludes *.progress.json; deleteDraft/publishCity remove it
src/app/admin-x7kq92mpfw4rt8vz/
  actions.ts                 ← getProgressAction()
  skills-meta.ts             ← NEW: icon/name/tagline per stage (client-safe, no imports)
  generate/[key]/stage-runner.tsx ← skill cards + polling feed + research chips
  admin.css                  ← pulse keyframes for the newest activity line
tests/
  progress.test.ts           ← NEW
  model.test.ts, pipeline.test.ts, drafts.test.ts, admin-logic.test.ts ← extended
tests/fixtures/stub-pipeline.json ← + "events" key (canned research activity)
scripts/admin-e2e.mjs        ← + feed/chips/cleanup checks
docs/superpowers/specs/2026-08-08-multi-tenant-dynamic-site-design.md ← "As built" addendum
```

---

### Task 1: Progress log module (TDD)

**Files:**
- Create: `src/pipeline/progress.ts`
- Modify: `src/content/drafts.ts` (listDrafts filter; deleteDraft + publishCity cleanup)
- Test: `tests/progress.test.ts`, extend `tests/drafts.test.ts`

**Interfaces:**
- Consumes: nothing new — `content/_drafts/` layout from drafts.ts.
- Produces (later tasks rely on these exact names):

```ts
// src/pipeline/progress.ts
export type ProgressKind = 'start' | 'search' | 'reading' | 'found' | 'done' | 'error'
export type ProgressEvent = {
  at: string        // ISO timestamp, new Date().toISOString() at append time
  stage: string     // StageId, typed as string to keep this module dependency-free
  kind: ProgressKind
  label: string
}
export const PROGRESS_CAP = 500
export async function appendProgress(key: string, event: Omit<ProgressEvent, 'at'>): Promise<void>
export async function readProgress(key: string): Promise<ProgressEvent[]>
export async function clearProgress(key: string, stage?: string): Promise<void>
```

Semantics to implement:
- File: `content/_drafts/<key>.progress.json`, a JSON array of ProgressEvent. `readProgress` returns `[]` when the file is missing or unparseable (a corrupt log must never break the admin).
- Key validation: same `/^[a-z0-9-]+$/` guard as drafts.ts (throw on mismatch).
- `appendProgress` reads, pushes `{...event, at: new Date().toISOString()}`, trims to the LAST `PROGRESS_CAP` entries, writes. All writes for a given key are **serialized through a module-level per-key promise chain** (`const chains = new Map<string, Promise<void>>()` — each call chains onto `chains.get(key) ?? Promise.resolved`, stores the new tail, and clears the entry when it settles) so concurrent appends from stream callbacks can't interleave read-modify-write cycles.
- `clearProgress(key)` deletes the file (`rm` with `force: true`); `clearProgress(key, stage)` rewrites the file keeping only events whose `stage` differs. Both go through the same chain.
- drafts.ts: `listDrafts()` currently keys off `files.filter((f) => f.endsWith('.json'))` — add `&& !f.endsWith('.progress.json')`. `deleteDraft(key)` and `publishCity(key, …)` additionally `rm` the progress file with `force: true` (import nothing from progress.ts to avoid a cycle — build the path locally: `path.join(DRAFTS_DIR, `${key}.progress.json`)`).

- [ ] **Step 1: Write the failing tests** — `tests/progress.test.ts` (mirror the existing tests' pattern: mutate real `content/` under vitest `fileParallelism: false`, clean up in `afterEach`):

```ts
import { afterEach, describe, expect, it } from 'vitest'
import { rm, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { appendProgress, readProgress, clearProgress, PROGRESS_CAP } from '../src/pipeline/progress'

const FILE = path.join(process.cwd(), 'content/_drafts/progress-spec.progress.json')

afterEach(async () => {
  await rm(FILE, { force: true })
})

describe('progress log', () => {
  it('returns [] for a missing file', async () => {
    expect(await readProgress('progress-spec')).toEqual([])
  })

  it('appends events with an ISO timestamp and reads them back in order', async () => {
    await appendProgress('progress-spec', { stage: 'research', kind: 'start', label: 'a' })
    await appendProgress('progress-spec', { stage: 'research', kind: 'search', label: 'b' })
    const events = await readProgress('progress-spec')
    expect(events.map((e) => e.label)).toEqual(['a', 'b'])
    expect(new Date(events[0].at).toString()).not.toBe('Invalid Date')
  })

  it('serializes concurrent appends — none are lost', async () => {
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        appendProgress('progress-spec', { stage: 'research', kind: 'search', label: `q${i}` })
      )
    )
    expect((await readProgress('progress-spec')).length).toBe(25)
  })

  it('caps the log at PROGRESS_CAP most-recent events', async () => {
    const events = Array.from({ length: PROGRESS_CAP + 5 }, (_, i) => ({
      at: new Date().toISOString(), stage: 'research', kind: 'search' as const, label: `q${i}`,
    }))
    await mkdir(path.dirname(FILE), { recursive: true })
    await writeFile(FILE, JSON.stringify(events), 'utf-8')
    await appendProgress('progress-spec', { stage: 'front', kind: 'start', label: 'last' })
    const read = await readProgress('progress-spec')
    expect(read.length).toBe(PROGRESS_CAP)
    expect(read[read.length - 1].label).toBe('last')
  })

  it('returns [] for a corrupt file instead of throwing', async () => {
    await mkdir(path.dirname(FILE), { recursive: true })
    await writeFile(FILE, 'not json', 'utf-8')
    expect(await readProgress('progress-spec')).toEqual([])
  })

  it('clearProgress(key, stage) removes only that stage’s events', async () => {
    await appendProgress('progress-spec', { stage: 'research', kind: 'start', label: 'r' })
    await appendProgress('progress-spec', { stage: 'front', kind: 'start', label: 'f' })
    await clearProgress('progress-spec', 'research')
    expect((await readProgress('progress-spec')).map((e) => e.stage)).toEqual(['front'])
  })

  it('clearProgress(key) removes the whole file', async () => {
    await appendProgress('progress-spec', { stage: 'research', kind: 'start', label: 'r' })
    await clearProgress('progress-spec')
    expect(await readProgress('progress-spec')).toEqual([])
  })

  it('rejects an invalid key', async () => {
    await expect(appendProgress('Bad Key!', { stage: 'research', kind: 'start', label: 'x' }))
      .rejects.toThrow(/invalid/)
  })
})
```

And in `tests/drafts.test.ts` add (using that file's existing helpers/fixtures for creating a draft — read the file first and follow its local conventions):

```ts
it('listDrafts ignores .progress.json sidecars', async () => {
  // create a normal draft via the file's existing helper, then:
  await writeFile(path.join(process.cwd(), 'content/_drafts/somecity.progress.json'), '[]', 'utf-8')
  const keys = (await listDrafts()).map((d) => d.key)
  expect(keys).not.toContain('somecity.progress')
  // cleanup in the test or afterEach
})

it('deleteDraft removes the progress file too', async () => { /* create draft + progress file, deleteDraft, expect both gone */ })
it('publishCity removes the progress file too', async () => { /* follow the file’s existing publish test setup, add a progress file, expect it gone after publish */ })
```

- [ ] **Step 2: Run the new tests, confirm they FAIL** (`pnpm test -- progress` and `pnpm test -- drafts`) — progress.ts doesn't exist; drafts assertions fail.
- [ ] **Step 3: Implement `src/pipeline/progress.ts` and the three drafts.ts edits** per the semantics block above. Framework-free (node:fs/promises + node:path only).
- [ ] **Step 4: Run the full suite — all green, both pins byte-intact.**
- [ ] **Step 5: Gates** — `pnpm exec tsc --noEmit` and `pnpm lint`.

### Task 2: ModelClient research events (TDD)

**Files:**
- Modify: `src/pipeline/model.ts`, `tests/fixtures/stub-pipeline.json`
- Test: extend `tests/model.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (deliberately decoupled — the callback is plain).
- Produces:

```ts
export type ResearchEvent = { kind: 'search' | 'reading'; label: string }
export interface ModelClient {
  research(prompt: string, key: string, onEvent?: (event: ResearchEvent) => void): Promise<string>
  generate<T>(args: GenerateArgs<T>): Promise<T>   // unchanged
}
```

- [ ] **Step 1: Extend the fixture.** Add a top-level `"events"` key to `tests/fixtures/stub-pipeline.json` (alongside `research` and `generated` — do NOT touch those values, tests round-trip them):

```json
"events": {
  "research": [
    { "kind": "search", "label": "Searching: Stubville Texas suburbs and neighborhoods" },
    { "kind": "search", "label": "Searching: Stubville TX residential ZIP codes" },
    { "kind": "reading", "label": "Reading search results…" }
  ]
}
```

- [ ] **Step 2: Write the failing tests** in `tests/model.test.ts` (this file is READ-ONLY against the committed fixture — never write to the fixture path from a test):

```ts
it('StubModelClient replays canned research events through onEvent, in order', async () => {
  const fixtures = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'))
  const client = new StubModelClient(fixtures)
  const seen: ResearchEvent[] = []
  await client.research('any prompt', 'research', (e) => seen.push(e))
  expect(seen).toEqual(fixtures.events.research)
})

it('StubModelClient research works with no onEvent (backwards compatible)', async () => {
  const fixtures = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'))
  const client = new StubModelClient(fixtures)
  await expect(client.research('any prompt', 'research')).resolves.toBeTypeOf('string')
})
```

- [ ] **Step 3: Run, confirm FAIL.**
- [ ] **Step 4: Implement.**
  - `StubModelClient` constructor arg type becomes `{ research: Record<string, string>; generated: Record<string, unknown>; events?: Record<string, ResearchEvent[]> }`; `research()` replays `fixtures.events?.[key] ?? []` through `onEvent` before returning the canned findings. `makeClient()`'s `StubFixtures` type gets the same optional field (the JSON already carries it).
  - `AnthropicModelClient.research()` maps streaming events when `onEvent` is provided. Reference implementation — **verify every event/property name against the installed SDK's `.d.ts` (BetaRawMessageStreamEvent and friends in `node_modules/@anthropic-ai/sdk`) before trusting this sketch**:

```ts
async research(prompt: string, key: string, onEvent?: (event: ResearchEvent) => void): Promise<string> {
  void key
  const stream = this.client.beta.messages.stream({ /* … exactly the current params … */ })
  if (onEvent) {
    const toolInputs = new Map<number, string>()
    stream.on('streamEvent', (event) => {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'server_tool_use') toolInputs.set(event.index, '')
        else if (event.content_block.type === 'web_search_tool_result') onEvent({ kind: 'reading', label: 'Reading search results…' })
      } else if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta' && toolInputs.has(event.index)) {
        toolInputs.set(event.index, toolInputs.get(event.index)! + event.delta.partial_json)
      } else if (event.type === 'content_block_stop' && toolInputs.has(event.index)) {
        const raw = toolInputs.get(event.index)!
        toolInputs.delete(event.index)
        let label = 'Searching the web…'
        try {
          const query = (JSON.parse(raw) as { query?: unknown }).query
          if (typeof query === 'string' && query.trim() !== '') label = `Searching: ${query}`
        } catch { /* partial json — keep the generic label */ }
        onEvent({ kind: 'search', label })
      }
    })
  }
  const message = await stream.finalMessage()
  /* … existing refusal check + concatText … */
}
```

  Accepted limitation (state it in a comment): the Anthropic mapping is exercised only by types + the next live run — tests cover the stub path, per the no-live-API rule. Event-handler errors must never kill the research call: wrap the handler body in try/catch that swallows.
- [ ] **Step 5: Run the full suite — green. Gates:** `pnpm exec tsc --noEmit`, `pnpm lint`.

### Task 3: Stage instrumentation + progress read API (TDD)

**Files:**
- Modify: `src/pipeline/stages.ts`, `src/pipeline/admin-logic.ts`, `src/app/admin-x7kq92mpfw4rt8vz/actions.ts`
- Test: extend `tests/pipeline.test.ts`, `tests/admin-logic.test.ts`

**Interfaces:**
- Consumes: `appendProgress/readProgress/clearProgress` (Task 1), `ResearchEvent` + `onEvent` research param (Task 2).
- Produces:

```ts
// admin-logic.ts
export type ProgressSnapshot =
  | { ok: true; events: ProgressEvent[]; done: string[]; research: { suburbs: string[]; zips: string[]; landmarks: string[] } | null }
  | { ok: false; error: string }
export async function getProgressLogic(key: string): Promise<ProgressSnapshot>
// actions.ts
export async function getProgressAction(key: string): Promise<ProgressSnapshot>
```

Event emissions to implement in `stages.ts` `executeStage` (all via `appendProgress(key, …)`; labels EXACTLY as written — the E2E asserts some of them):

| When | stage | kind | label |
|---|---|---|---|
| research: before `client.research` | research | start | `` `Searching the web for ${facts.city} suburbs, ZIP codes, and landmarks` `` |
| research: forwarded from `onEvent` | research | search / reading | (as emitted by the client — pass through) |
| research: after findings, before structuring | research | found | `Collected findings — structuring into suburbs, ZIPs, landmarks` |
| research: after `normalizeResearchSlugs` | research | found | `` `${r.suburbs.length} areas · ${r.zips.length} ZIP codes · ${r.landmarks.length} landmarks · ${r.keywords.length} search phrases` `` |
| research: end of case | research | done | `Research complete` |
| front: before generate | front | start | `` `Writing hero and services copy for ${facts.city}` `` |
| front: after | front | done | `` `${out.heroParagraphs.length} hero paragraphs · ${out.serviceIntro.length} intro paragraphs · 5 service cards` `` |
| home: before | home | start | `Composing ZIP and landmark sentences from researched data` |
| home: after | home | done | `` `ZIP sentence (${research.zips.length} codes) · landmark sentence (${research.landmarks.length} landmarks)` `` |
| deep: before | deep | start | `` `Writing the deep-cleaning explainer for ${facts.city}` `` |
| deep: after | deep | done | `` `“What is deep cleaning” paragraph (${out.whatIs.trim().split(/\s+/).length} words)` `` |

The `onEvent` forwarder passed to `client.research` cannot `await` (it's a sync callback): call `void appendProgress(key, { stage: 'research', kind: e.kind, label: e.label })` — safe because Task 1 serializes writes.

Error + regenerate semantics:
- `runStage`: wrap the `executeStage` call in try/catch; on catch `await appendProgress(key, { stage, kind: 'error', label: errorMessage })` then rethrow (existing behavior preserved — admin-logic's `attempt()` still converts to `{ok:false}`).
- `regenerateStage`: after `clearStageOutputs`, also `await clearProgress(key, stage)`; when stage is `research`, clear `front`/`home`/`deep` progress too (mirrors the existing downstream clearing).

- [ ] **Step 1: Write the failing tests.** In `tests/pipeline.test.ts` (follow its existing setup that creates a draft and runs stages against `StubModelClient`):

```ts
it('runStage(research) writes start, forwarded search, found summary, and done events', async () => {
  await runStage(stubClient, KEY, 'research')
  const events = await readProgress(KEY)
  const kinds = events.map((e) => e.kind)
  expect(kinds[0]).toBe('start')
  expect(kinds).toContain('search')          // forwarded from the stub fixture
  expect(kinds.filter((k) => k === 'found').length).toBe(2)
  expect(kinds[kinds.length - 1]).toBe('done')
  expect(events.every((e) => e.stage === 'research')).toBe(true)
})

it('front done event carries the counts summary', async () => {
  await runStage(stubClient, KEY, 'research')
  await runStage(stubClient, KEY, 'front')
  const events = await readProgress(KEY)
  const done = events.filter((e) => e.stage === 'front' && e.kind === 'done')
  expect(done).toHaveLength(1)
  expect(done[0].label).toMatch(/hero paragraphs · .* intro paragraphs · 5 service cards/)
})

it('a failing stage appends an error event and still rejects', async () => {
  const failing: ModelClient = { research: async () => { throw new Error('boom') }, generate: async () => { throw new Error('boom') } }
  await expect(runStage(failing, KEY, 'research')).rejects.toThrow('boom')
  const events = await readProgress(KEY)
  expect(events[events.length - 1]).toMatchObject({ stage: 'research', kind: 'error', label: expect.stringContaining('boom') })
})

it('regenerateStage(research) clears research AND downstream progress', async () => {
  // run all four stages, then regenerate research; readProgress must contain
  // no 'front'/'home'/'deep' events older than the regenerate
  ...actual assertions: after regenerateStage, events for front/home/deep are only absent (stub reruns only research here — regenerate re-runs research immediately, so expect exactly research events)
})
```

  (Write the fourth test concretely against the real behavior: `regenerateStage(stubClient, KEY, 'research')` re-runs research, so afterwards `readProgress(KEY)` contains ONLY `stage: 'research'` events.)

  In `tests/admin-logic.test.ts`:

```ts
it('getProgressLogic returns events, done, and research lists after research runs', async () => {
  // create draft + run research via runStageLogic (STUB_MODEL=1 is set by this suite's existing setup)
  const snap = await getProgressLogic(KEY)
  expect(snap.ok).toBe(true)
  if (snap.ok) {
    expect(snap.done).toContain('research')
    expect(snap.events.length).toBeGreaterThan(0)
    expect(snap.research?.suburbs.length).toBeGreaterThan(0)
    expect(typeof snap.research?.suburbs[0]).toBe('string')  // names, not objects
  }
})

it('getProgressLogic on an unknown key returns ok:false', async () => {
  const snap = await getProgressLogic('no-such-city')
  expect(snap.ok).toBe(false)
})
```

- [ ] **Step 2: Run, confirm FAIL.**
- [ ] **Step 3: Implement** stages.ts emissions/clearing per the table, `getProgressLogic` in admin-logic.ts (loadDraft → done + research name/zips/landmarks string lists, readProgress → events; catch → `{ok:false, error}`), and the thin `getProgressAction` wrapper in actions.ts (no revalidatePath — it's a read).
- [ ] **Step 4: Run the full suite — green. Gates:** tsc + lint.

### Task 4: Skill cards UI + polling feed + E2E + docs

**Files:**
- Create: `src/app/admin-x7kq92mpfw4rt8vz/skills-meta.ts`
- Modify: `generate/[key]/stage-runner.tsx`, `generate/[key]/page.tsx` (only if prop plumbing needs it), `admin.css`, `scripts/admin-e2e.mjs`, design spec (As-built addendum)

**Interfaces:**
- Consumes: `getProgressAction(key): Promise<ProgressSnapshot>` (Task 3), existing StageRunner props (`cityKey`, `stages`, `initialDone`).
- Produces: `SKILL_META: Record<string, { icon: string; name: string; tagline: string }>` (client-safe module, zero imports).

- [ ] **Step 1: Create `skills-meta.ts`** (typographic apostrophes; these strings are user-visible):

```ts
export const SKILL_META: Record<string, { icon: string; name: string; tagline: string }> = {
  research: { icon: '🔎', name: 'City Research', tagline: 'Deep web search — suburbs, ZIP codes, landmarks, local search phrases' },
  front: { icon: '✍️', name: 'Front-Page Copywriter', tagline: 'Hero and services copy, locked to the approved slots' },
  home: { icon: '📍', name: 'Local Area Writer', tagline: 'ZIP and landmark sentences from researched data only — nothing invented' },
  deep: { icon: '🫧', name: 'Deep-Clean Copywriter', tagline: 'The “what is deep cleaning” explainer with a local angle' },
}
```

- [ ] **Step 2: Rework StageRunner.** Keep the execution engine (busy ref, sequential `runStageAction`, retry, auto-finalize) UNTOUCHED. Add display state fed by polling:

```ts
const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null)
useEffect(() => {
  let stopped = false
  const tick = async () => {
    const snap = await getProgressAction(cityKey)
    if (!stopped) setSnapshot(snap)
  }
  void tick()
  const id = setInterval(() => void tick(), 1200)
  return () => { stopped = true; clearInterval(id) }
}, [cityKey])
// stop polling once finalize is done:
useEffect(() => { if (finalizePhase === 'done') { /* clear the interval via a ref, or gate tick on phase */ } }, [finalizePhase])
```

  (Implementer's choice on the stop mechanism — a ref holding the interval id gated on `finalizePhase` is fine; polling an idle page is also harmless, but stop it after finalize to be tidy.)

  Each `<li>` becomes a skill card:
  - Header row: `SKILL_META[stage.id].icon` in a rounded badge, `name` in 0.95rem semibold, status glyph right-aligned (keep the existing ✓/⏳/✗/• glyphs and tones).
  - Under the name: `tagline` in 0.75rem `text-[#6b7680]`.
  - Activity area (from `snapshot.ok ? snapshot.events.filter(e => e.stage === stage.id) : []`):
    - While `isRunning`: show the LAST 3 events as mono 0.75rem lines (`font-mono`), oldest→newest; the newest line gets the `admin-pulse` class. Do not render `error` events here (the existing `failed` block owns error display).
    - When `isDone`: show only the last `found`/`done` summary line (single muted line, e.g. `11 areas · 18 ZIP codes · 10 landmarks · 12 search phrases`).
  - Research chips: when `stage.id === 'research'` and `snapshot.ok && snapshot.research`, render under the activity area a wrap row of chips — every suburb name as a pill (`rounded-full border border-[#d8dde2] px-2 py-0.5 text-[0.7rem]`), then two summary pills: `` `${research.zips.length} ZIP codes` `` and `` `${research.landmarks.length} landmarks` ``.
  - Keep the label from `stage.label` OUT of the card (SKILL_META replaces it visually) but keep the prop wiring — the stages.ts labels still serve logs/tests.

- [ ] **Step 3: `admin.css`** — add (scoped under the admin root like the existing rules):

```css
@keyframes admin-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
[data-admin-root] .admin-pulse { animation: admin-pulse 1.4s ease-in-out infinite; }
```

- [ ] **Step 4: Run the unit gates** (`pnpm test`, tsc, lint) — no unit tests cover the client component; they must simply stay green.
- [ ] **Step 5: Extend `scripts/admin-e2e.mjs`.** After the existing "all four stages complete" check and before publish, add checks (stub stages are instant, so assert the POST-completion UI plus the persisted log):
  - Generate screen shows the four skill names (`City Research`, `Front-Page Copywriter`, `Local Area Writer`, `Deep-Clean Copywriter`).
  - Research chips: all three fixture suburbs (`North Stubville`, `Mock Hollow`, `Fixture Heights`) render on the GENERATE screen (poll up to ~10s for the snapshot to arrive — the 1.2s poll needs a beat).
  - The research summary line matches `/\d+ areas · \d+ ZIP codes · \d+ landmarks/`.
  - `content/_drafts/stubville.progress.json` exists and (via `fs.readFileSync` + JSON.parse) contains an event with `kind: 'search'` whose label includes `Searching:` (the fixture event).
  - AFTER the publish step: the progress file is gone (publishCity cleanup).
  - Update the cleanup `finally` block to also `rm` the progress file (`force: true`) so an aborted run leaves `content/` pristine.
- [ ] **Step 6: Full E2E run** — `fuser -k 3100/tcp; STUB_MODEL=1 pnpm dev --port 3100` then `node scripts/admin-e2e.mjs`; ALL checks must pass (26 existing + the new ones).
- [ ] **Step 7: Build + crawler** — `fuser -k 3100/tcp; pnpm build && pnpm start --port 3100` then `node scripts/snapshot-pages.mjs compare` → must print `EQUIVALENT (11 routes)` (admin-only change; any public-route diff is a defect).
- [ ] **Step 8: Docs** — append a short "As built (Plan 4)" subsection to `docs/superpowers/specs/2026-08-08-multi-tenant-dynamic-site-design.md`: progress log file location and cap, the event kinds, the polling design (display-only; StageRunner remains the sole driver), the stub-events fixture key, and the accepted limitation that the Anthropic stream mapping is verified by types + the next live run.

---

## Self-review notes

- Spec coverage: user-approved scope = live activity feed (Tasks 2–4), results-as-they-land chips (Tasks 3–4), skill framing (Task 4). Flow unchanged; no token streaming (explicit non-goal).
- Type consistency: `ProgressEvent`/`ProgressKind` (Task 1) ← used by Task 3 emissions and `ProgressSnapshot`; `ResearchEvent` (Task 2) ← forwarded in Task 3; `getProgressAction` (Task 3) ← polled in Task 4. `SKILL_META` keys = `STAGE_IDS`.
- The one intentional coupling risk: E2E asserts exact skill names and the summary-line shape — both are pinned in this plan's text (Task 3 table, Task 4 Step 1), not invented by implementers.
