# Multi-City Routing + Preview (Plan 2b of 3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One deployment serves every city: the request's Host picks the city, `/​<cityKey>/…` internal paths double as draft preview, the content store is async and Blob-ready, and every trap recorded in the design spec's findings (stateName, book.ts phone, three maps, length-agnostic suburbs, loader validation) is closed — while Minneapolis's public URLs and HTML stay byte-identical (crawler gate).

**Architecture:** The Vercel multi-tenant pattern: all pages move under `app/(sites)/[city]/` (route groups preserved); `src/middleware.ts` rewrites `Host + public path → /<cityKey>/<path>`; `generateStaticParams` prebuilds live cities; draft cities render on demand at their internal `/<cityKey>` paths — that IS the preview (unguessable-URL model, per the no-auth decision; supersedes the spec's `/preview/<city>` sketch — same capability, one less mechanism). `getCity` becomes async behind one store module (local `content/*.json` now, Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set), with runtime validation so one bad city document 404s that city only.

**Tech Stack:** unchanged + `@vercel/blob` (only dependency added; unused until the env var exists). No auth, no DB.

**PROJECT RULE — NO COMMITS.** Never `git commit`/`git add`; never `--update` tests. Checkpoints only.

## Gates (after EVERY task unless stated)

- `pnpm test` — all green, ZERO writes to `tests/__snapshots__/data-equivalence.test.ts.snap` (hash `dd34c783…` must survive the whole plan).
- `pnpm exec tsc --noEmit` && `pnpm lint` — clean.
- Tasks 4–6: crawler gate on the DEFAULT host (public paths): `EQUIVALENT (11 routes)`.
- All "Minneapolis" sweeps use **case-insensitive** grep (`-i`) per spec finding 6c.

## File structure

```
content/
  minneapolis.json          ← extended (stateName, phoneDisplay, maps, contactAddress)
  testville.json            ← NEW draft fixture city (tests + preview verification)
  _domains.json             ← NEW host → cityKey index
src/content/
  types.ts                  ← extended CityContent
  validate.ts               ← NEW runtime validator (no new deps)
  store.ts                  ← async getCity/getDefaultCity/resolveCityKey, Blob-or-file
  interpolate.ts            ← + {stateName}, {phoneDisplay} tokens
src/middleware.ts           ← NEW host→city rewrite
src/app/(sites)/[city]/…    ← all pages relocate here (groups preserved)
src/data/book.ts            ← becomes bookData(c) builder (city-dependent after all)
tests/
  validate.test.ts store.test.ts middleware.test.ts render-city.test.tsx  ← NEW
```

---

### Task 1: Extend `CityContent` + runtime validation + seed update (TDD)

**Files:** Modify `src/content/types.ts`, `content/minneapolis.json`; create `src/content/validate.ts`, `tests/validate.test.ts`.

- [x] **Step 1:** Extend the type (append fields; existing fields unchanged):

```ts
// added to CityContent:
  /** Full state name for SEO copy, e.g. "Minnesota" (spec finding 5). */
  stateName: string
  /** Display-format phone used by the booking pages, e.g. "(612) 424-0391" (finding 6b). */
  phoneDisplay: string
  /** Contact-page address variant; falls back to `address` when absent (finding: three live variants). */
  contactAddress?: string
  /** The three map embeds (finding 6): null renders no map. */
  maps: {
    front: string | null    // ServiceArea band
    home: string | null     // home Locations MapEmbed
    contact: string | null  // contact page (replaces research.mapEmbedUrl reads)
  }
  /** Suburb pages exist only for Minneapolis; false renders Areas We Serve unlinked. */
  hasSuburbPages: boolean
```
`research.mapEmbedUrl` stays in the type (Plan 3's research output) but rendering now reads `maps.contact`.

- [x] **Step 2 (failing test first):** `tests/validate.test.ts` — `validateCityContent(x)` returns the typed doc for a valid one and throws naming EVERY missing/mistyped field (not just the first) for: missing phone, non-array suburbs, missing maps, wrong status literal, missing stateName. Include a minimal-valid fixture inline.
- [x] **Step 3:** Implement `src/content/validate.ts` — hand-rolled (no deps): checks every required field's type/shape, accumulates errors, throws `new Error('invalid city document: ' + errors.join('; '))`. Export `validateCityContent(raw: unknown): CityContent`.
- [x] **Step 4:** Hand-edit `content/minneapolis.json` (NEVER re-run extract-seed.mjs — it is self-referential now): add `stateName: "Minnesota"`, `phoneDisplay: "(612) 424-0391"`, `contactAddress: "5821 Cedar Lake Road Suite 208 Minneapolis, MN 55416"` (the contact page's live variant — moves that literal out of contact.ts in Task 3), `hasSuburbPages: true`, `maps: { front: <current literal from src/components/ServiceArea.tsx>, home: <current literal from src/components/home/MapEmbed.tsx>, contact: <current research.mapEmbedUrl value> }` — copy each URL byte-exactly from its current source.
- [x] **Step 5:** Wire validation into the store: `registry` values pass through `validateCityContent`. Gates (existing tests still green — the new fields are additive).
- [x] **Step 6:** Checkpoint.

---

### Task 2: Async store + domains index (TDD)

**Files:** Modify `src/content/store.ts`; create `content/_domains.json`, `tests/store.test.ts`; install `pnpm add @vercel/blob`. Convert the 13 `getDefaultCity()` call sites.

- [x] **Step 1:** `content/_domains.json`:
```json
{ "default": "minneapolis", "hosts": {} }
```
(`hosts` maps e.g. `"miamicleans.com": "miami"` at publish time; empty today.)
- [x] **Step 2 (failing tests first):** store.test.ts — `await getCity('minneapolis')` resolves + validates; unknown key rejects; `resolveCityKey('localhost:3100')` → 'minneapolis' (default); `resolveCityKey('miamicleans.com')` with a hosts entry → mapped key; `listLiveCityKeys()` → ['minneapolis'] (testville is draft once Task 5 adds it).
- [x] **Step 3:** Implement: `getCity(key): Promise<CityContent>` — if `process.env.BLOB_READ_WRITE_TOKEN`, fetch `content/<key>.json` from Blob (via `@vercel/blob`'s `head`+fetch, with the local file as build-time fallback); else read the local `content/<key>.json` (fs at build/server — import via `fs/promises` NOT static import, so new cities don't require rebuilds when Blob-backed). Cache per-process with a small `Map` + `revalidateCity(key)` invalidator (Plan 3 admin uses it). Keep `cityBits` sync as-is. `getDefaultCity()` → `getCity(domains.default)`.
- [x] **Step 4:** Convert all 13 call sites (6 pages, 2 layouts, 5 generateMetadata) to `async` + `await`. Mechanical; tsc drives the list. NOTE: `contact/page.tsx` was already converted to generateMetadata shape — just add async/await.
- [x] **Step 5:** Gates. Checkpoint.

---

### Task 3: Close the data-level traps (stateName, book.ts, maps, contact address)

**Files:** Modify `src/content/interpolate.ts`, `src/app/(sites-pending)/(front)/page.tsx` (still at its old path this task), `src/data/book.ts`, `src/data/contact.ts`, `src/components/ServiceArea.tsx`, `src/components/home/MapEmbed.tsx`, `src/components/contact/ContactMap.tsx`, `src/components/book/{BookSection,ComingSoonPanel,BookNowSection}.tsx`, book pages.

- [x] **Step 1:** interpolate.ts: extend `TokenSource` with `stateName` + `phoneDisplay`; add both tokens; update `cityBits(c)` in store.ts to include them. Update the interpolate tests.
- [x] **Step 2:** Front metadata: `"…{city} Minnesota - Ivy Cleans"` → `"…{city} {stateName} - Ivy Cleans"`; delete the PLAN-2B TRAP comment (resolved). Byte-identical for Minneapolis.
- [x] **Step 3:** book.ts → `bookData(c: CityContent)` builder (same shapes; phone fields become `c.phoneDisplay`/`c.phone`/`c.phoneHref` per current formats — verify each current literal's format first and match the right field). Thread props through the book pages/components (same R3 pattern as 2a). Add `book` to the data-equivalence test? NO — the pinned snapshot has no `book` entry; ADD a NEW separate snapshot test `tests/book-data.test.ts` pinning `bookData(minneapolis)` (first run writes, second run stable — this is a NEW pin, allowed; the plan-1 pins remain untouched).
- [x] **Step 4:** Maps: ServiceArea + MapEmbed take a `mapSrc: string | null` prop (from `city.maps.front`/`maps.home`), rendering nothing when null; ContactMap reads `maps.contact` via contactData (change `contactData` to use `c.maps.contact ?? ''` → now `contactMap.src` sourced from maps; keep returned shape). Conditional-omit only triggers on null — Minneapolis values are non-null so bytes unchanged.
- [x] **Step 5:** contact.ts: `contactInfo.address` ← `c.contactAddress ?? c.address` (Minneapolis's contactAddress now carries the "Suite 208" variant — byte-identical; the literal + its fallback comment are replaced by a note pointing at the CityContent field).
- [x] **Step 6:** Gates + case-insensitive sweep: `grep -rin "minneapolis\|minnesota\|612-424\|612 424\|6124240391" src/ --include="*.ts" --include="*.tsx" | grep -vi "comment-pattern…"` — report every remaining hit with its category (route folder names are Task 4's job; comments OK; reviews.ts/blog.ts content OK per contract).
- [x] **Step 7:** Checkpoint.

---

### Task 4: `[city]` route restructure + middleware (the big move)

**Files:** Move `src/app/(front)` and `src/app/(inner)` under `src/app/(sites)/[city]/`; create `src/middleware.ts`, `tests/middleware.test.ts`; adjust root layout/globals as needed.

- [x] **Step 1:** Move the route groups: `src/app/(sites)/[city]/(front)/…` and `…/[city]/(inner)/…` (git mv-style moves of the files; import paths fixed). Root `src/app/layout.tsx` stays root (html/body/font). Every page/layout in the moved tree: accept `params: Promise<{ city: string }>` (Next 16 async params), `const { city: cityKey } = await params; const c = await getCity(cityKey)` replacing `getDefaultCity()` calls. Unknown city key → `notFound()` (catch the store's rejection).
- [x] **Step 2:** Per-city service-page slugs: replace the two literal folders `deep-cleaning-minneapolis` and `minneapolis-move-out-cleaning-services` with ONE dynamic segment `[serviceSlug]/page.tsx` under `[city]/(inner)/` that: computes the two valid slugs for this city via `t('/deep-cleaning-{citySlug}'…)`-equivalents (`citySlug(c.city)`), renders the deep-cleaning page for one and move-out for the other, `notFound()` otherwise. `generateStaticParams` emits both slugs per live city. `generateMetadata` dispatches accordingly.
- [x] **Step 3:** `generateStaticParams` on `[city]`: `listLiveCityKeys()`; `export const dynamicParams = true` (draft cities render on demand = preview).
- [x] **Step 4:** `src/middleware.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import domains from '../content/_domains.json'

const INTERNAL = /^\/(_next|images|icons|favicon|icon|api)\b|\.\w+$/

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (INTERNAL.test(pathname)) return
  const host = req.headers.get('host')?.toLowerCase() ?? ''
  const mapped = (domains.hosts as Record<string, string>)[host]
  const seg = pathname.split('/')[1]
  // Already an internal /<cityKey>/ path (preview): pass through.
  if (!mapped && seg && isCityKeyShaped(seg) && cityKeyExistsHint(seg)) return
  const cityKey = mapped ?? domains.default
  const url = req.nextUrl.clone()
  url.pathname = `/${cityKey}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}
```
The exact pass-through predicate is the design decision to implement carefully: the middleware cannot read fs — ship a tiny generated `content/_cities.json` (array of known city keys, updated when a city is added) imported statically, so `cityKeyExistsHint` = array lookup. Public paths that collide with a city key are acceptable-by-construction (city keys are lowercase single segments like `minneapolis`; no public page shares that shape except the city paths themselves).
- [x] **Step 5:** middleware.test.ts — pure-function tests over the rewrite logic (export a testable `resolveRewrite(host, pathname)` helper from a non-middleware module and have middleware call it): default-host public path → `/minneapolis/...`; mapped host → its city; internal `/minneapolis/home` passthrough; `/testville/...` passthrough; `/_next/...` untouched.
- [x] **Step 6:** Gates + crawler: public URLs (`/`, `/home`, `/deep-cleaning-minneapolis`, …) must return the SAME HTML through the middleware → `EQUIVALENT (11 routes)`. Also `curl -s localhost:3100/minneapolis/ | head -c 200` — renders (internal path works).
- [x] **Step 7:** Checkpoint.

---

### Task 5: New-city rendering behaviors + Testville fixture

**ADDENDUM (from Task 4's review):** (a) `tests/middleware.test.ts` carries a case
asserting `/testville/x` rewrites to the default city — adding testville to
`content/_cities.json` flips it to passthrough; the test MUST be updated, not
just the fixture added. (b) **Browsable preview:** draft-status cities must
render CITY-PREFIXED internal links (`/testville/home`) so the preview can be
walked page-to-page; live cities keep public links (their domains depend on
it). Implement via a central `cityHref(c, path)` helper used by every
data-builder href and inline href call site; `status === 'draft'` prefixes
with `/<citySlug-key>`; Minneapolis (live) output stays byte-identical.

**Files:** Modify `src/components/ServiceArea.tsx`, `src/components/home/Locations.tsx`; create `content/testville.json`, `tests/render-city.test.tsx`.

- [x] **Step 1:** `content/testville.json` — a complete DRAFT city (`status: "draft"`, `hasSuburbPages: false`, `stateName: "Testonia"`, 3 suburbs, maps all null, distinct phone/copy slots — fill every required section slot with clearly-fake strings; must pass `validateCityContent`).
- [x] **Step 2:** ServiceArea + Locations become length-agnostic and honor `hasSuburbPages` (new prop threaded from pages): when false, render suburb NAMES without `<Link>`; split derived from `areas.length` (`Math.ceil(len/2)`), grid rows derived likewise. For Minneapolis (24, true) the rendered HTML must stay byte-identical — verify the generated class strings match exactly (`grid-rows-12` = `Math.ceil(24/2)` = 12 → construct the class from the number; confirm Tailwind's generated CSS still includes it via the build, since `grid-rows-12` appears statically today — if dynamic class construction breaks Tailwind's static extraction, use inline `style={{ gridTemplateRows: … }}` ONLY for non-24 counts and keep the literal class for 24 — decide by testing, document the choice). Delete the now-resolved PLAN-2 TRAP comments.
- [x] **Step 3:** `tests/render-city.test.tsx` — `react-dom/server.renderToStaticMarkup`: ServiceArea with testville data → no `<a` tags, 3 names present; with minneapolis data → 24 `<a`, href of first = `/house-cleaning-apple-valley`; Locations with testville → all 3 names rendered (nothing dropped), no links.
- [x] **Step 4:** Gates + crawler (Minneapolis unchanged) + `curl` testville preview: serve, `curl -s localhost:3100/testville/ | grep -o "Testville" | head -1` → renders the draft city.
- [x] **Step 5:** Checkpoint.

---

### Task 6: Full gates + preview verification + docs

- [x] **Step 1:** Full suite: `pnpm test` (all green; plan-1 snapshot hash unchanged) + tsc + lint.
- [x] **Step 2:** `pnpm build` — live cities prebuilt (route table shows `/minneapolis/...`); serve on 3100; crawler compare on public paths → `EQUIVALENT (11 routes)`; `curl` checks: `/` (front page 200), `/deep-cleaning-minneapolis` (200), `/testville/` (200, draft preview), `/testville/deep-cleaning-testville` (200), `/nonexistent-city-xyz/` (404 or default-rewrite — document actual), `/minneapolis/home` (200).
- [x] **Step 3:** Update the design spec: mark findings 1–7 resolved/moved as appropriate; document the preview model (internal `/<cityKey>` paths, no `/preview` prefix) and the `_domains.json`/`_cities.json` publish contract for Plan 3.
- [x] **Step 4:** Report with all evidence. **No commits.**

---

## Self-review notes

- Findings closure: 1 (async per-request city — T2/T4), 3 (conditional maps + contactAddress — T3), 4 (validation — T1), 5 (stateName — T3), 6/6b/6c (maps, book.ts, -i greps — T3/gates), M5 (static-vs-dynamic: [city] + generateStaticParams — T4), suburbs length-agnostic/unlinked — T5. Item 2 (zips/landmarks canonical form) stays Plan 3.
- Known risks called out in-task: Tailwind dynamic-class extraction (T5 Step 2 decides by testing); middleware fs-access constraint (solved via `_cities.json` static import); Next 16 async params shape (T4 Step 1).
- New snapshot pins allowed ONLY for new data (book-data test); the Plan-1 pin file is untouchable throughout.
