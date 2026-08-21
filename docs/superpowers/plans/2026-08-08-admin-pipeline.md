# Admin UI + Claude Pipeline (Plan 3 of 3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Abdi-facing product: a hidden admin at an unguessable route where entering a city + phone runs the Claude pipeline (web-grounded research → schema-validated section writers), producing a browsable draft at `/<cityKey>/`, with per-stage regenerate and one-click publish — while Minneapolis stays byte-identical (crawler gate) and all tests run WITHOUT live API calls (stub model client).

**Architecture:** Ported from the proven microsite generator: a `ModelClient` seam (Anthropic SDK streaming + zod structured outputs; `StubModelClient` for tests + `STUB_MODEL=1` E2E), per-stage resumable pipeline persisting into a draft sidecar (`content/_drafts/<key>.json` — NOT a CityContent until complete), finalize → validate → `content/<key>.json` + `_cities.json` + `revalidateCity`. Facts (phone formats, stateName) are DERIVED deterministically from form input — never through the model. Research is two calls: a web-search call (server tool `web_search_20260209`) then a structuring call (`zodOutputFormat`) — avoids mixing server tools with structured outputs in one request. ZIPs/landmarks resolve spec finding 2: structured arrays live in `research.*`, the writer composes the two prose slots from them, both stored.

**Tech Stack:** + `@anthropic-ai/sdk`, `zod` (only new deps). Model `claude-opus-5` (thinking on by default — no `thinking` param, no temperature; `output_config.effort`), streaming with `finalMessage()`, `stop_reason === "refusal"` handled. Env: `ANTHROPIC_API_KEY` in `.env.local` (gitignored — verify), optional `STUB_MODEL=1`.

**PROJECT RULE — NO COMMITS.** Never `git commit`/`git add`; never `--update` the plan-1/2 pins (`data-equivalence`, `book-data`). NEW pins for new tests are allowed. No LIVE API calls in any test or task — the only live-API step is Task 7, which is USER-GATED.

**Admin path:** `/admin-x7kq92mpfw4rt8vz` (unguessable segment, baked as the folder name; changing it = renaming the folder). The proxy must pass it through.

## Gates (after EVERY task)

`pnpm test` all green (pins byte-intact) + `pnpm exec tsc --noEmit` + `pnpm lint`. Tasks 5–6 add build + crawler `EQUIVALENT (11 routes)` + curl checks. Ports: 3100 via `fuser -k 3100/tcp` / `ss -lptn 'sport = :3100'`; 3000 off-limits.

## File structure

```
src/pipeline/
  facts.ts        ← derive phone/phoneDisplay/phoneHref/stateName (deterministic)
  schemas.ts      ← zod: ResearchSchema + per-group section schemas
  model.ts        ← ModelClient seam: AnthropicModelClient + StubModelClient
  stages.ts       ← research / front / home / deep stage functions (pure-ish, resumable)
src/content/
  drafts.ts       ← draft sidecar CRUD + finalize→publish (writes content/<key>.json, _cities.json, _domains.json)
src/app/admin-x7kq92mpfw4rt8vz/
  page.tsx        ← dashboard  ·  new/page.tsx ← form  ·  generate/[key]/page.tsx ← progress
  review/[key]/page.tsx ← review/publish  ·  actions.ts ← server actions
content/_drafts/  ← sidecars (gitignored? NO — keep on disk visible; add to .gitignore only if user wants)
tests/
  facts.test.ts drafts.test.ts pipeline.test.ts admin-actions.test.ts
```

---

### Task 1: Deps + facts derivation (TDD)

- [x] `pnpm add @anthropic-ai/sdk zod`.
- [x] **Failing tests first** — `tests/facts.test.ts` for `deriveFacts(input: {city, state, phoneDigits, address?, notes?})` from `src/pipeline/facts.ts`:
  - `deriveFacts({city:'Miami', state:'FL', phoneDigits:'3055550142'})` → `{phone:'305-555-0142', phoneDisplay:'(305) 555-0142', phoneHref:'tel:3055550142', stateName:'Florida'}`;
  - 10-digit validation: rejects 9/11 digits and non-digits with a clear Error;
  - `stateName` for 'MN'→'Minnesota', 'TX'→'Texas'; unknown code → Error listing the code;
  - state code case-insensitive input, normalized to uppercase.
- [x] Implement: full 50-state (+DC) code→name map; formatters from the digit string. Pure module, no deps.
- [x] Gates.

### Task 2: Schemas + model client seam (TDD, stub only)

- [x] `src/pipeline/schemas.ts` (zod; every object `additionalProperties` handled by zod `.strict()`; NO unsupported constraints — no min/max lengths):
  - `ResearchSchema`: `{ suburbs: [{name, slug}] (≈8–12 expected — enforce by prompt, not schema), zips: string[], landmarks: string[], keywords: string[] }`
  - `FrontSectionsSchema`: `{ heroParagraphs: string[], serviceIntro: string[], cards: {dusting, vacuuming, bathroom, window, upholstery: string} }`
  - `HomeProseSchema`: `{ zipParagraph: string, landmarksParagraph: string }`
  - `DeepSchema`: `{ whatIs: string }`
- [x] `src/pipeline/model.ts`:
```ts
export type GenerateArgs<T> = { schema: z.ZodType<T>; system: string; prompt: string; key: string }
export interface ModelClient {
  research(prompt: string, key: string): Promise<string>      // web-search call, returns findings text
  generate<T>(args: GenerateArgs<T>): Promise<T>              // structured call
}
```
  - `AnthropicModelClient`: model `claude-opus-5`. `generate`: `client.beta.messages.stream({ model, max_tokens: 64000, system, output_config: { format: zodOutputFormat(schema, key) }, messages:[{role:'user',content:prompt}], betas:['server-side-fallback-2026-07-01'], fallbacks:'default' })` → `finalMessage()` → check `stop_reason === 'refusal'` → throw a descriptive Error (surfaced by the UI as retryable); else parse the text content with `schema.parse(JSON.parse(text))`. `research`: same client, `tools:[{type:'web_search_20260209', name:'web_search', max_uses: 8}]`, streaming, concatenate final text blocks. NOTE: web-search call carries NO output_config (server tools + structured outputs stay separate by design). Include the server-side fallback opt-in on both calls and note it in a comment (Opus 5 classifiers can refuse; 'default' reroutes by category).
  - `StubModelClient`: constructed with `Record<key, unknown>`; `generate` returns the canned value parsed through the schema (so stubs are validated too); `research` returns a canned string. Export `makeClient(): ModelClient` choosing Stub when `process.env.STUB_MODEL === '1'` (stub then loads canned Stubville data from `tests/fixtures/stub-pipeline.json` — created in Task 4).
- [x] Tests: schema round-trips; StubModelClient validates canned data and rejects malformed; NO Anthropic instantiation in tests (guard: instantiating AnthropicModelClient without ANTHROPIC_API_KEY should throw early with a clear message — test that).
- [x] Gates.

### Task 3: Draft store + finalize/publish (TDD)

- [x] `src/content/drafts.ts`:
  - `DraftDoc = { facts: {city,state,stateName,phone,phoneDisplay,phoneHref,address,notes?}, research?: ResearchOutput, sections: Record<string,string|string[]>, done: string[], createdAt: string }`
  - `saveDraft/loadDraft/listDrafts/deleteDraft` on `content/_drafts/<key>.json` (key = citySlug(city); reject mismatched keys).
  - `finalizeDraft(key): Promise<void>` — assembles a full `CityContent` (status 'draft', hasSuburbPages false, maps all null, contactAddress = facts.address, `research: {suburbs, zips, landmarks, mapEmbedUrl: null}`, the 10 section slots incl. composed zip/landmarks prose) → `validateCityContent` → write `content/<key>.json` → append key to `content/_cities.json` (idempotent) → `revalidateCity(key)`. Draft sidecar retained until publish.
  - `publishCity(key, domain?)` — set doc status 'live' (+`domain`), write; if domain: add lowercased host to `content/_domains.json` hosts; `revalidateCity`; delete the sidecar; Next `revalidatePath('/', 'layout')` from the calling action (not here — keep this module framework-free; export what the action needs).
- [x] Verify + fix if needed: `listLiveCityKeys` and any `content/` readdir must ignore DIRECTORIES (`_drafts/`) — add a store test proving a populated `content/_drafts/` doesn't break it.
- [x] Tests with temp keys (create/cleanup in the test, keys prefixed `ztest-` and removed in afterAll; confirm no leftovers): sidecar CRUD; finalize of a complete draft passes validation and lands in _cities.json; finalize of an INCOMPLETE draft throws naming the missing slots; publish flips status and maps the domain.
- [x] Gates.

### Task 4: Pipeline stages + stub E2E (TDD)

- [x] `src/pipeline/stages.ts` — four stage functions, each `(client: ModelClient, key: string) => Promise<void>`: load draft → skip if `done` includes stage → run → persist results + push stage name to `done`. Stages:
  1. `runResearch`: prompt = deep-research brief for "cleaning services {city}, {stateName}" — REAL suburbs with slug patterns matching the live site's four styles, REAL zips, REAL landmarks, SEO keywords; client.research() → client.generate(ResearchSchema) structuring the findings. Persist to `draft.research`.
  2. `runFront`: consumes research (suburbs/keywords/notes) → FrontSectionsSchema → sections `services.heroParagraphs`, `services.serviceIntro`, `services.cards.*`. System prompt: verbatim-tone guide — match the live site's voice, city-substantive (climate, housing stock), NEVER invent phone numbers/addresses/prices, English copy.
  3. `runHome`: composes `home.zipParagraph` + `home.landmarksParagraph` FROM `draft.research.zips/landmarks` (prompt embeds the arrays; instructs: use ONLY these zips/landmarks, template mirrors the Minneapolis sentences) → HomeProseSchema.
  4. `runDeep`: `deep.whatIs` → DeepSchema.
  - `STAGES` export: ordered `['research','front','home','deep']` with display labels (drives the progress UI). `regenerateStage(client,key,stage)`: remove stage (+its outputs) from draft, rerun (research regen also clears downstream stages — document why: they consumed it).
- [x] `tests/fixtures/stub-pipeline.json` — canned Stubville outputs for all 4 stages (valid per schemas, distinct fake copy mentioning "Stubville").
- [x] `tests/pipeline.test.ts` — full run with StubModelClient on key `ztest-stubville`: all stages complete, `finalizeDraft` succeeds, resulting doc passes `validateCityContent`, resume works (delete one `done` entry, rerun only re-executes that stage — assert via a counting stub), regenerate clears downstream. Cleanup all files.
- [x] Gates.

### Task 5: Admin UI + server actions + proxy passthrough

- [x] **Proxy:** `src/content/resolve-rewrite.ts` — pass through any path whose first segment starts with `admin-` (before the city-key logic). Update `tests/middleware.test.ts` (+2 cases: `/admin-x7kq92mpfw4rt8vz` → null; `/admin-fake` → null too — simpler rule, harmless: unknown admin-* 404s naturally).
- [x] `actions.ts` ('use server'): `createDraft(form)` (deriveFacts + saveDraft + redirect to generate), `runStage(key, stage)` (makeClient + stage fn; returns `{ok}|{error}`), `regenerate(key, stage)`, `updateSuburbs(key, suburbs)` (edit research.suburbs in draft OR the finalized doc + revalidate), `finalize(key)`, `publish(key, domain?)` (+ `revalidatePath('/', 'layout')`). Each action try/catches and returns serializable errors (refusal/API errors surface as text).
- [x] **Screens** (server components + one small client component for the progress runner; styling: clean utilitarian Tailwind, system stack, no fidelity constraints — this route is OUTSIDE the (sites) tree so the crawler/live site is untouched):
  1. **Dashboard `page.tsx`**: table of cities from store (live: from _cities + status) + drafts-in-progress (listDrafts): name, status chip (LIVE/DRAFT/GENERATING), links (preview `/<key>`, review, resume). “+ New City” button.
  2. **New `new/page.tsx`**: form — City, State (2-letter), Phone (digits, any format — strip to digits), Address (optional), Notes (optional textarea, "the only field the AI reads verbatim"). Client-side required validation; submits `createDraft`.
  3. **Generate `generate/[key]/page.tsx`**: renders the STAGES checklist; a client component walks stages sequentially calling `runStage` (server action) per stage, updating ✓/⏳/✗ + error text with a per-stage Retry button; on all-done calls `finalize` then links to Review. (Per-stage actions keep each request short — serverless-duration friendly.)
  4. **Review `review/[key]/page.tsx`**: big "Open preview" link → `/<key>` (target _blank); suburbs editor (name+slug rows, save via `updateSuburbs`); per-stage Regenerate buttons (with the research-clears-downstream warning); Publish box: optional domain input + Publish button (confirm dialog) → `publish` → success state with the live note ("attach the domain to the Vercel project — manual step").
- [x] `tests/admin-actions.test.ts` — action-level tests with STUB_MODEL=1 (set/unset via beforeAll/afterAll env): createDraft derives facts correctly; runStage sequence completes; publish writes _domains. (Actions are async fns — import and call directly; if the 'use server' directive breaks vitest import, move logic to `src/pipeline/admin-logic.ts` and keep actions as thin wrappers — decide by testing, document.)
- [x] Gates + build + crawler `EQUIVALENT (11 routes)` + curls: `/admin-x7kq92mpfw4rt8vz` 200 on 3100 (direct, no rewrite), `/testville` still 200.

### Task 6: Stubbed browser E2E + docs + spend cap note

- [x] Playwright E2E (borrow `/home/kyousuke/Bajig/Intern-Project/epathways/node_modules/playwright`, headless, port 3100, `STUB_MODEL=1 pnpm start` — verify env reaches server actions in prod server; else run `next dev` on 3100 for the E2E and note it): script drives the real UI — dashboard → New City ("Stubville", TS, 5555550123) → progress runs all stages green → review → preview `/stubville` contains "Stubville" → publish (no domain) → dashboard shows LIVE. Cleanup: remove stubville content/_cities entries after. Screenshots to scratch. This is verification tooling — script lives in `scripts/admin-e2e.mjs` (documented, not in CI).
- [x] Crawler gate again post-E2E cleanup (`EQUIVALENT (11 routes)`).
- [x] Docs: update the design spec — mark the admin/pipeline sections "as built" (route, stages, draft sidecar contract, finding 2 resolution); document `.env.local` (`ANTHROPIC_API_KEY`, spend-cap recommendation in the Anthropic Console), `STUB_MODEL`; append remaining manual steps (Vercel deploy, Blob env var, domain attach).
- [x] Full gates. Report.

### Task 7 (USER-GATED — do NOT run without explicit user approval in-conversation)

- [x] Real Miami generation through the admin UI on the live API (~a few dollars): user supplies/confirms the phone + go-ahead; run, review `/miami` preview together, do NOT publish. Report copy-quality findings.

## Self-review notes

- Spec coverage: admin 4 screens ✓ (approved UX), pipeline skills ✓ (research web-grounded; facts never in prompts — deriveFacts is code), draft→preview→publish ✓ (2b's preview does the heavy lifting), publish contract ✓ (_cities/_domains/revalidateCity per the spec's "As built" section), finding 2 resolved ✓ (structured research + composed prose, both stored). Suburbs editable ✓. Per-stage regenerate ✓.
- Deliberately OUT: images (slot reserved), blog, book copy generation, suburb pages, Resend contact routing, Vercel API automation, auth. `maps` null for new cities (renders nothing — 2b behavior).
- API-currency: web_search_20260209 (no beta header), zodOutputFormat via output_config.format, streaming+finalMessage, no thinking param on opus-5, refusal check + server-side fallbacks opt-in (beta header `server-side-fallback-2026-07-01`, `fallbacks:'default'`) — from the claude-api skill reference, not memory.
- Cost controls: stub for ALL tests/E2E; live spend only in user-gated Task 7; spend-cap doc note.
