# City Parameterization (Plan 2a of 3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the module-scope city freeze: every data module becomes a pure function of a `CityContent`, every page/component receives city data via props, and every remaining hardcoded "Minneapolis" in components/pages becomes a token template — while the rendered Minneapolis site stays byte-identical (same gates as Plan 1).

**Architecture:** Transition-shim strategy. Each data file gains a `<name>Data(c: CityContent)` builder returning exactly today's export shape; the legacy consts are re-implemented as `builder(getDefaultCity())` so nothing breaks mid-plan. Consumers then migrate group-by-group from const imports to props threaded from pages/layouts (which call `getDefaultCity()` — the single point Plan 2b replaces with per-request resolution). Finally the legacy consts and `src/content/city.ts` are deleted and the equivalence test is re-pointed at the builders **without changing the pinned snapshot bytes**.

**Tech Stack:** unchanged (Next 16.2.12, TS, vitest, pnpm). No new dependencies.

**PROJECT RULE — NO COMMITS.** Never `git commit`/`git add`; never run tests with `--update`. Every task ends at a Checkpoint.

**Why this decomposition (from Plan 1's final review, recorded in the design spec):** swapping a `currentCity` constant per request cannot work — module-scope exports freeze process-wide, and four consumers are `"use client"` components that can only receive per-request data via props. This plan pays that migration down while the byte-equality gates are still cheap to run.

## Gates (run after EVERY task)

- `pnpm test` — 15 tests green, ZERO snapshot writes. The pinned snapshots in `tests/__snapshots__/data-equivalence.test.ts.snap` are NEVER regenerated in this plan.
- `pnpm exec tsc --noEmit` — clean.
- Tasks 7–8 additionally run the HTML crawler compare (baseline from Plan 1): `EQUIVALENT (11 routes)` required.

## File structure

```
src/content/
  slots.ts            ← NEW  s(c,id)/sl(c,id) — render-time, not module-eval
  store.ts            ← NEW  city registry + getDefaultCity() (Plan 2b seam)
  city.ts             ← DELETED in Task 7 (legacy currentCity/s/sl)
  interpolate.ts      ← unchanged
  types.ts            ← unchanged
src/data/*.ts         ← each gains a builder + (temporarily) legacy consts
src/components/**     ← const imports → props; hardcoded city strings → t()
src/app/**            ← pages/layouts resolve the city and thread props
tests/data-equivalence.test.ts ← re-pointed at builders (same snapshot keys/bytes)
```

## Global mechanical rules

**R1 — Builder shape.** For data file `X.ts` with exports `a`, `b`, `c` (types excluded), add:
```ts
export type XData = { a: <type>; b: <type>; c: <type> }
export function xData(c: CityContent): XData { return { a: …, b: …, c: … } }
```
Field expressions are the file's CURRENT expressions with `currentCity` → `c`, `s('id')` → `s(c, 'id')`, `sl('id')` → `sl(c, 'id')`, `t(str, currentCity)` → `t(str, c)`. Copy strings verbatim — never retype (typographic ’ and – throughout).

**R2 — Transition shim.** In the same file, until Task 7, keep the legacy exports as:
```ts
const __default = xData(getDefaultCity())
export const a = __default.a
export const b = __default.b
…
```
Byte-identical values ⇒ snapshots stay green while unmigrated consumers still work.

**R3 — Component migration.** A component importing data consts instead accepts them as props:
```ts
// before: import { site } from '../data/site'
// after:
export function CtaBand({ site }: { site: SiteData['site'] }) { … }
```
The nearest server ancestor (page or layout) builds the data once and passes it down. Client components (`"use client"`) receive only plain serializable values (all our data is).

**R4 — Hardcoded city strings in components.** Replace each literal containing "Minneapolis" with `t("… {city} …", city)` where `city` is a `CityBits` prop (`{ city, state, phone, phoneHref }` — pass `cityBits(c)` from `store.ts`). Copy the current string verbatim, swap only the city token. Never invent copy.

**R5 — After migrating a component, delete its data-const imports.** A file may not import both props and consts for the same data.

---

### Task 1: `slots.ts` + `store.ts` (TDD)

**Files:** Create `src/content/slots.ts`, `src/content/store.ts`, `tests/slots.test.ts`.

- [x] **Step 1: failing test first**

```ts
// tests/slots.test.ts
import { describe, expect, test } from 'vitest'
import { s, sl } from '../src/content/slots'
import { getDefaultCity, getCity, cityBits } from '../src/content/store'

describe('slots + store', () => {
  const c = getDefaultCity()
  test('default city is minneapolis, live', () => {
    expect(c.city).toBe('Minneapolis')
    expect(c.status).toBe('live')
    expect(getCity('minneapolis')).toBe(c)
  })
  test('s/sl read typed slots', () => {
    expect(typeof s(c, 'deep.whatIs')).toBe('string')
    expect(Array.isArray(sl(c, 'services.heroParagraphs'))).toBe(true)
  })
  test('s/sl throw on missing or mistyped slots', () => {
    expect(() => s(c, 'nope')).toThrow(/missing or not a string/)
    expect(() => s(c, 'services.heroParagraphs')).toThrow()
    expect(() => sl(c, 'deep.whatIs')).toThrow(/missing or not a list/)
  })
  test('getCity throws on unknown key', () => {
    expect(() => getCity('atlantis')).toThrow(/unknown city/i)
  })
  test('cityBits picks the token source', () => {
    expect(cityBits(c)).toEqual({
      city: 'Minneapolis', state: 'MN',
      phone: '612-424-0391', phoneHref: 'tel:6124240391',
    })
  })
})
```

- [x] **Step 2:** run `pnpm test tests/slots.test.ts` — FAIL (modules missing).

- [x] **Step 3: implement**

```ts
// src/content/slots.ts
/*
 * Render-time slot accessors. Unlike Plan 1's module-eval accessors, these
 * take the city document explicitly, so a bad document fails the REQUEST
 * (or the per-city build) — never the whole process (Plan 1 review #8).
 */
import type { CityContent } from './types'

export function s(c: CityContent, id: string): string {
  const v = c.sections[id]
  if (typeof v !== 'string') throw new Error(`content slot "${id}" missing or not a string for city "${c.city}"`)
  return v
}

export function sl(c: CityContent, id: string): string[] {
  const v = c.sections[id]
  if (!Array.isArray(v)) throw new Error(`content slot "${id}" missing or not a list for city "${c.city}"`)
  return v
}
```

```ts
// src/content/store.ts
/*
 * The city registry. Plan 2a: static, file-backed, single live city.
 * Plan 2b swaps the inside of getCity/getDefaultCity for host-resolved,
 * Blob-backed lookup with draft support — the SIGNATURES are the seam.
 */
import type { CityContent } from './types'
import type { TokenSource } from './interpolate'
import minneapolis from '../../content/minneapolis.json'

const registry: Record<string, CityContent> = {
  minneapolis: minneapolis as CityContent,
}

export function getCity(key: string): CityContent {
  const c = registry[key]
  if (!c) throw new Error(`unknown city "${key}"`)
  return c
}

/** Plan 2b replaces this with per-request tenant resolution. */
export function getDefaultCity(): CityContent {
  return getCity('minneapolis')
}

/** The token subset components need for t() templates. */
export function cityBits(c: CityContent): TokenSource {
  return { city: c.city, state: c.state, phone: c.phone, phoneHref: c.phoneHref }
}
```

- [x] **Step 4:** `pnpm test && pnpm exec tsc --noEmit` — all green (20 tests), 0 writes.
- [x] **Step 5:** Checkpoint — no commit.

---

### Task 2: Builders in all 8 data files (shimmed, zero consumer changes)

**Files:** Modify `src/data/{site,services,home,packages,areas,contact,deep-cleaning,move-out}.ts`.

- [x] **Step 1:** Apply **R1 + R2** to each file. Builder names/shapes:
  - `site.ts` → `siteData(c): { site: …; innerSite: … }` (the two objects exactly as today, `as const` dropped in favor of the returned shape — legacy consts keep working via the shim).
  - `services.ts` → `servicesData(c): { heroParagraphs; serviceIntro; services }` (+ keep `Service` type export).
  - `home.ts` → `homeData(c): { homeMeta; nearMe; features; featuresOutro; houseCleaning; principles; zipParagraph; landmarksParagraph; workImages }` (+ `Feature` type).
  - `packages.ts` → `packagesData(c): { packagesIntro; packages }` (+ `Pkg` type).
  - `areas.ts` → `areasData(c): { areas }` (+ `Area` type).
  - `contact.ts` → `contactData(c): { contactMeta; contactHeader; contactFields; contactSubmitLabel; contactMap; contactInfo }` (+ field types). The address stays the literal string inside the builder (Plan-1 fallback decision — unchanged).
  - `deep-cleaning.ts` → `deepCleaningData(c): { deepMeta; deepHero; whatIs; benefitsBgImage; benefits; deepServices; deepServicesLinkHref; deepServicesLinkedItemIndex; whyChoose }` (+ `DeepQuality` type).
  - `move-out.ts` → `moveOutData(c): { moveOutMeta; moveHero; whyMoveOut; included; whyIvy; cost }` (+ `MoveOutQuality` type).
- [x] **Step 2:** Every file's imports change from `{ currentCity, s, sl }` / `'../content/city'` to `{ s, sl }` from `'../content/slots'`, `{ getDefaultCity }` from `'../content/store'`, `CityContent` type from `'../content/types'`. Nothing else in the repo changes in this task.
- [x] **Step 3:** Gates: `pnpm test` (20 green, 0 writes — the shim reproduces identical bytes) + `tsc --noEmit`.
- [x] **Step 4:** Checkpoint.

---

### Task 3: Chrome — layouts + shared frame components

**Files:** Modify `src/app/(front)/layout.tsx`, `src/app/(inner)/layout.tsx`, `src/components/{TopBar,Header,Footer,CtaBand,CtaButton}.tsx`, `src/components/inner/{InnerHeader,InnerFooter}.tsx`.

- [x] **Step 1:** Both layouts become city-aware and thread props (R3):

```ts
// src/app/(front)/layout.tsx — pattern
import { getDefaultCity, cityBits } from '../../content/store'
import { siteData } from '../../data/site'

export default function FrontLayout({ children }: { children: React.ReactNode }) {
  const c = getDefaultCity()          // Plan 2b: per-request city
  const { site } = siteData(c)
  const bits = cityBits(c)
  return (<>
    <TopBar site={site} />
    <Header site={site} />
    {children}
    <Footer site={site} />
  </>)
}
```
(Inner layout mirrors this with `innerSite`/`InnerHeader`/`InnerFooter`, preserving the existing `tpl-inner` wrapper div exactly.)

- [x] **Step 2:** Each listed component: R3 (props replace const imports) and R5. `CtaBand` also applies R4 to its one hardcoded heading (line ~54, "…Minneapolis…") using a `bits` prop — pass `bits` from wherever `CtaBand` is rendered (check each call site; pages render it too — update those call sites in THIS task only if the page is otherwise untouched, passing props from a local `getDefaultCity()` at the top of the page; full page migration happens in Tasks 4–6).
- [x] **Step 3 — Header/InnerHeader dropdown fix (the documented PLAN-2 TRAP):** replace the label-string matching with **index-based split**: the dropdown children are `site.nav[2]` and `site.nav[3]` (fixed template structure — the nav array is authored in `siteData` in exactly this order). Add: `// nav[2]/nav[3] are the per-city service pages — index-based, label text is city-dependent (see src/data/site.ts PLAN-2 TRAP note, now resolved here).` Remove the stale trap wording from `site.ts`'s comment (keep the slug↔route-folder half, which Plan 2b resolves).
- [x] **Step 4:** Gates + **crawler spot-check**: rebuild + serve on 3100 + `node scripts/snapshot-pages.mjs compare` → `EQUIVALENT (11 routes)` (chrome is on every page; catch drift immediately). Kill the server after.
- [x] **Step 5:** Checkpoint.

---

### Task 4: Front page group

**Files:** Modify `src/app/(front)/page.tsx` and `src/components/{Hero,FeaturedIn,Intro,IntroVideo,ServiceTypes,Packages,ServiceArea,Values,BeforeAfter,Reviews,Faq,BlogPreview}.tsx`.

- [x] **Step 1:** `(front)/page.tsx` resolves the city once, builds `servicesData/packagesData/areasData/homeData(c)` as needed, and passes props to every section component. Its inline `metadata` export (2 hardcoded mentions) becomes `generateMetadata()` using `t()` with the city — output strings byte-identical.
- [x] **Step 2:** Components: R3/R5 everywhere; R4 for the hardcoded strings (from the audit): `Hero` h1 (1), `Intro` heading (1), `ServiceArea` heading (1), `Values` body copy (2), `Reviews` "Ivy Cleans Minneapolis" label (1), `IntroVideo` iframe title attr (1). `Faq` takes `faqs` from `src/data/faqs.ts` — that file is static (no city): components may KEEP importing static-only modules directly (`faqs.ts`, `posts.ts`, `reviews.ts`, `cleaning-services.ts` rooms, `blog.ts`, `book.ts` stay const modules — they have no city dependency and are out of scope).
- [x] **Step 3:** Gates (tests + tsc).
- [x] **Step 4:** Checkpoint.

---

### Task 5: Home page group

**Files:** Modify `src/app/(inner)/home/page.tsx`, `src/components/home/{HomeHero,HomeServices,HomeCta,NearMe,Features,HouseCleaning,Principles,Locations,WorkCarousel,HomeFaqStatic,MapEmbed,VideoEmbed}.tsx` (only those importing city-dependent data or containing hardcoded city strings — audit each).

- [x] **Step 1:** Page resolves city, builds `homeData/servicesData/areasData/siteData`, threads props; `homeMeta` via `generateMetadata()`.
- [x] **Step 2:** R4 sweep: `HomeHero` h1 (1), `HomeServices` heading (1), `NearMe` heading (1), `HouseCleaning` headings (3).
- [x] **Step 3:** Gates. Checkpoint.

---

### Task 6: Inner pages group

**Files:** Modify `src/app/(inner)/{cleaning-services,contact,faq,blog,book,deep-cleaning-minneapolis,minneapolis-move-out-cleaning-services,do-i-need-to-be-home-during-a-deep-cleaning-service}/page.tsx`, `src/app/(front)/book-now/page.tsx`, `src/components/{contact,deep-cleaning,move-out,cleaning-services}/**` (city-dependent ones only).

- [x] **Step 1:** Each page: resolve city → build its data → thread props; metas via `generateMetadata()` where city-dependent (`deepMeta`, `moveOutMeta`, `contactMeta` is static — verify). Blog/book pages import only static modules — verify and leave unchanged where true.
- [x] **Step 2:** deep-cleaning + move-out + contact component folders: R3/R5. (Their copy is already tokenized in the builders; components should carry no hardcoded city strings — verify with grep, fix any stragglers via R4.)
- [x] **Step 3:** Route folder names stay `deep-cleaning-minneapolis`/`minneapolis-move-out-cleaning-services` in this plan (public URLs must not change; Plan 2b makes them per-city).
- [x] **Step 4:** Gates. Checkpoint.

---

### Task 7: Delete the legacy layer + re-point the equivalence test

**Files:** Modify all 8 `src/data/*.ts` (remove R2 shims), `tests/data-equivalence.test.ts`; DELETE `src/content/city.ts`.

- [x] **Step 1:** Repo-wide check first: `grep -rn "from '../content/city'\|from '../../content/city'\|from '@/content/city'" src/` and `grep -rn "import {.*\b(site|innerSite|heroParagraphs|serviceIntro|services|homeMeta|nearMe|features|featuresOutro|houseCleaning|principles|zipParagraph|landmarksParagraph|workImages|packagesIntro|packages|areas|contactMap|contactInfo|deepMeta|deepHero|whatIs|benefits|deepServices|whyChoose|moveOutMeta|moveHero|whyMoveOut|included|whyIvy|cost)\b.*} from '.*data/" src/app src/components` — every hit must be a static-only module (faqs/posts/reviews/cleaning-services/blog/book) or a missed migration: migrate stragglers before proceeding.
- [x] **Step 2:** Remove the `__default`/legacy const exports from the 8 data files (keep builders + types). Delete `src/content/city.ts`.
- [x] **Step 3:** Re-point the equivalence test — same snapshot NAMES, same serialized SHAPES, zero snapshot writes:

```ts
// tests/data-equivalence.test.ts (new body — snapshots must NOT change)
import { describe, expect, test } from 'vitest'
import { getDefaultCity } from '../src/content/store'
import { siteData } from '../src/data/site'
import { servicesData } from '../src/data/services'
import { homeData } from '../src/data/home'
import { packagesData } from '../src/data/packages'
import { areasData } from '../src/data/areas'
import { contactData } from '../src/data/contact'
import { deepCleaningData } from '../src/data/deep-cleaning'
import { moveOutData } from '../src/data/move-out'

const c = getDefaultCity()
const modules = {
  site: siteData(c),
  services: servicesData(c),
  home: homeData(c),
  packages: packagesData(c),
  areas: areasData(c),
  contact: contactData(c),
  deep: deepCleaningData(c),
  moveOut: moveOutData(c),
}

describe('data module values are unchanged by the content-layer refactor', () => {
  for (const [name, mod] of Object.entries(modules)) {
    test(name, () => {
      expect(JSON.parse(JSON.stringify(mod))).toMatchSnapshot()
    })
  }
})
```
⚠️ The old namespace snapshots serialized ONLY value exports, in export order. The builders' returned objects must serialize to the same key sets. If a snapshot fails on key ORDER (JSON.stringify is insertion-ordered), reorder the builder's returned object literal to match the original export order — never touch the snapshot. If it fails on a missing key (e.g. a type-only export was never in the snapshot), compare against the `.snap` file to see the pinned keys.
- [x] **Step 4:** Gates: `pnpm test` (20 green, 0 writes) + `tsc` + `pnpm lint`.
- [x] **Step 5:** Final grep gate: `grep -rn "Minneapolis" src/ | grep -v "^\S*:.*//\|/\*\| \* "` — remaining hits must be ONLY: comments, `contact.ts`'s literal address (documented fallback), and t() template files' comment mentions. Report the exact list.
- [x] **Step 6:** Checkpoint.

---

### Task 8: Full gates

- [x] **Step 1:** `pnpm test && pnpm exec tsc --noEmit && pnpm lint` — all green.
- [x] **Step 2:** `lsof -ti:3100 -sTCP:LISTEN | xargs -r kill; pnpm build; (PORT=3100 pnpm start &)`; wait for up; `node scripts/snapshot-pages.mjs compare` → **`EQUIVALENT (11 routes)`**; kill the server.
- [x] **Step 3:** Report: gates evidence + the Task 7 grep list. **No commits made.**

---

## Self-review notes

- Coverage vs the recorded Plan-2 inputs: module-freeze resolved (builders + getDefaultCity seam) ✓; client components get props ✓ (Header/InnerHeader/Reviews/WorkCarousel all in Tasks 3–5); Header label-trap fixed (index split) ✓; slot throws moved out of module-eval ✓ (slots.ts). Deliberately NOT here (Plan 2b): host routing, [city] routes, domains index, draft preview, Blob, unlinked suburbs for new cities, length-agnostic grids, conditional map embed, contactAddress field, zips/landmarks canonicalization.
- Type consistency: `TokenSource` (interpolate) is the `cityBits` return type; builders take `CityContent`; component props reference builder return types (`SiteData['site']` etc.).
- The static-only modules (faqs, posts, reviews, cleaning-services, blog, book) intentionally keep const exports — they contain no city-dependent content per the contract, so parameterizing them is YAGNI.
- Snapshot-key-order risk in Task 7 is called out with its exact remedy.
