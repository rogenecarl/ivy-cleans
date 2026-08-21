# Seven Service Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve seven service pages from one template at `/services/<slug>`, migrating the two that exist today onto the new URLs without changing how either looks.

**Architecture:** The five deep-cleaning section components become a generic service template driven by one `ServiceContent` shape. Deep cleaning migrates onto it and must render byte-identically, which is what proves the extraction was lossless. Move-out keeps its own components and only changes URL. A service registry maps seven slugs to their renderers; a new `services/[serviceSlug]` route resolves against it, and the old route permanently redirects.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-22-service-pages-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **The public site is a pixel-and-byte-accurate clone.** Apart from the two URLs that deliberately move, the HTML crawler must report `EQUIVALENT` on every public route at the end of every task. This is the hardest constraint in the plan.
- **Deep cleaning must render byte-identically after migrating to the template.** Not "looks right" — byte-identical, diffed against a capture taken before the change. If it differs, the extraction was lossy.
- **Never use default Tailwind rem utilities** (`text-sm`, `p-4`, `gap-2`) for sizes on public pages. `src/app/globals.css` sets a viewport-stepped root font-size, so those resolve to the wrong pixels. Use explicit arbitrary values traced to the reference CSS, matching the surrounding code. Admin pages are exempt; nothing in this plan touches admin.
- **Apostrophes in user-visible copy must render U+2019.** In JSX text use `&rsquo;`; in strings inside `src/data/*.ts` use a literal `’`, because those render as JSX expressions where an entity would print literally. Follow the file you are editing.
- **`src/data/*.ts` is the only place user-visible copy lives.** Components take it as props and never inline strings.
- **Commit each task on `main` once it passes** — the repo owner has approved committing per task for this work. Implementers stage and stop; the controller commits after review, so nothing unreviewed lands.
- **Tests:** Vitest via `pnpm test`, currently 338 passing (8 of them need `DATABASE_URL`; the sandbox's route to Neon is intermittent, so a store-test failure with `ETIMEDOUT`/`ENETUNREACH` is environmental, not yours — say so rather than "fixing" it).
- **The nav is index-coupled.** `src/components/Header.tsx:15` builds its services dropdown as `[site.nav[2], site.nav[3]]` and filters `i !== 2 && i !== 3`; `InnerHeader.tsx` does the same. **This plan does not change the NUMBER of nav entries**, only where two of them point. Do not add nav entries; doing so silently breaks both headers.

---

## File Structure

**New:**

| File | Responsibility |
|------|----------------|
| `src/components/service/{Hero,WhatIs,Benefits,ServicesList,WhyChoose}.tsx` | The template's five sections, moved from `deep-cleaning/` |
| `src/data/service-types.ts` | `ServiceContent`, `ServiceQuality` |
| `src/data/services/registry.ts` | Seven slugs to their content builders / renderers |
| `src/data/services/{standard,apartment,airbnb,post-construction,pre-listing}.ts` | One `ServiceContent` builder each |
| `src/app/(sites)/[city]/(inner)/services/[serviceSlug]/page.tsx` | The new route |

**Modified:**

| File | Change |
|------|--------|
| `src/data/deep-cleaning.ts` | Returns `ServiceContent`; keeps its AI slot |
| `src/app/(sites)/[city]/(inner)/[serviceSlug]/page.tsx` | Deep and move branches become permanent redirects; suburb branch untouched |
| `src/data/site.ts` | The two nav hrefs point at `/services/...` |
| `src/app/(sites)/[city]/(inner)/home/page.tsx` | `deepHref` / `moveOutHref` point at `/services/...` |

**Deleted:** `src/components/deep-cleaning/` after the move.

---

### Task 1: Extract the service template and migrate deep cleaning

**Files:**
- Move: `src/components/deep-cleaning/*.tsx` → `src/components/service/`
- Create: `src/data/service-types.ts`
- Modify: `src/data/deep-cleaning.ts`, `src/app/(sites)/[city]/(inner)/[serviceSlug]/page.tsx`

**Interfaces:**
- Produces: `ServiceContent`, `ServiceQuality` from `src/data/service-types.ts`; `deepCleaningData(c): ServiceContent`; the five components under `@/components/service/`.
- Consumes: nothing new.

**This task is a rename, not a redesign.** Every line of JSX inside the five components stays exactly as it is. Only the file location, the component names, the prop names and the type names change. Resist every urge to tidy while you are in there: the byte-identical check below is only meaningful if nothing else moved.

- [ ] **Step 1: Capture the before-state**

Start a dev server and save the rendered HTML of the page you are about to change, for both a live and a draft city:

```bash
STUB_MODEL=1 STUB_EMAIL=1 nohup pnpm dev --port 3100 > /tmp/dev-t1.log 2>&1 &
# poll until ready
until [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/)" = "200" ]; do sleep 1; done
curl -s http://localhost:3100/deep-cleaning-minneapolis > /tmp/deep-before-live.html
curl -s http://localhost:3100/miami/deep-cleaning-miami > /tmp/deep-before-draft.html
wc -c /tmp/deep-before-live.html /tmp/deep-before-draft.html
```

Both must be non-empty. If either is, stop — you cannot prove the migration without a baseline.

- [ ] **Step 2: Write the shared types**

Create `src/data/service-types.ts`:

```ts
// src/data/service-types.ts
/*
 * The shape every service page's content builder returns.
 *
 * This is DeepCleaningData renamed field-for-field, deliberately: the template
 * under src/components/service/ was extracted from the deep-cleaning
 * components, and deep cleaning has to keep rendering byte-identically through
 * it. Changing the shape while extracting would leave two variables in that
 * check instead of one.
 */
export type ServiceQuality = {
  title: string
  text: string
  icon: string
  width: number
  height: number
}

export type ServiceContent = {
  meta: { title: string; description: string }
  hero: { h1: string; paragraphs: string[] }
  whatIs: { h2: string; text: string; image: string }
  benefitsBgImage: string
  benefits: {
    h2: string
    intro: string[]
    listIntro: string
    items: string[]
    outro: string
  }
  services: {
    h2: string
    image: string
    listIntro: string
    items: string[]
    note: string
    contact: string
  }
  /* The live deep-cleaning page turns one list item into a link. Preserved
   * rather than dropped: dropping it would change that page's markup. */
  servicesLinkHref: string
  servicesLinkedItemIndex: number
  whyChoose: {
    h2: string
    paragraphs: string[]
    listIntro: string
    qualities: ServiceQuality[]
    closing: string
    contact: string
  }
}
```

- [ ] **Step 3: Move the components**

```bash
mkdir -p src/components/service
git mv src/components/deep-cleaning/DeepHero.tsx src/components/service/Hero.tsx
git mv src/components/deep-cleaning/WhatIs.tsx src/components/service/WhatIs.tsx
git mv src/components/deep-cleaning/Benefits.tsx src/components/service/Benefits.tsx
git mv src/components/deep-cleaning/DeepServices.tsx src/components/service/ServicesList.tsx
git mv src/components/deep-cleaning/WhyChoose.tsx src/components/service/WhyChoose.tsx
rmdir src/components/deep-cleaning
```

In each moved file, rename ONLY:
- the default export: `DeepHero` → `Hero`, `DeepServices` → `ServicesList`; the other three keep their names
- prop types referencing `DeepCleaningData["deepHero"]` etc. → `ServiceContent["hero"]` etc., importing from `@/data/service-types`
- `DeepQuality` → `ServiceQuality`

Change no JSX, no className, no comment describing live-site measurements.

- [ ] **Step 4: Point deep-cleaning's data at the shared type**

In `src/data/deep-cleaning.ts`: import `ServiceContent` from `./service-types`, delete the local `DeepCleaningData` and `DeepQuality` declarations, change the return type to `ServiceContent`, and rename the returned keys — `deepMeta`→`meta`, `deepHero`→`hero`, `deepServices`→`services`, `deepServicesLinkHref`→`servicesLinkHref`, `deepServicesLinkedItemIndex`→`servicesLinkedItemIndex`. `whatIs`, `benefits`, `benefitsBgImage` and `whyChoose` keep their names.

**Every string value stays byte-identical**, including `s(c, 'deep.whatIs')`, which is the AI-filled per-city slot. Do not turn it into static copy.

- [ ] **Step 5: Update the route's deep branch**

In `src/app/(sites)/[city]/(inner)/[serviceSlug]/page.tsx`, update the imports and the destructuring in `DeepCleaningPage` to the new names. The JSX it renders stays identical.

- [ ] **Step 6: Prove it is byte-identical**

```bash
# restart the dev server so the change is picked up, then:
curl -s http://localhost:3100/deep-cleaning-minneapolis > /tmp/deep-after-live.html
curl -s http://localhost:3100/miami/deep-cleaning-miami > /tmp/deep-after-draft.html
diff /tmp/deep-before-live.html /tmp/deep-after-live.html && echo "LIVE IDENTICAL"
diff /tmp/deep-before-draft.html /tmp/deep-after-draft.html && echo "DRAFT IDENTICAL"
```

Expected: both print IDENTICAL with no diff output.

If they differ, do NOT proceed and do NOT adjust the baseline. Read the diff, find what the rename changed, and fix it. A difference here means the template is not faithful and all five new pages would inherit the flaw.

- [ ] **Step 7: Verify and stage**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm build
pnpm test
fuser -k 3100/tcp
git add -A src
```

Expected: clean, and the suite at its current count. Then report the two diff results verbatim.

---

### Task 2: The service registry

**Files:**
- Create: `src/data/services/registry.ts`
- Test: `tests/service-registry.test.ts`

**Interfaces:**
- Consumes: `ServiceContent` (Task 1), `deepCleaningData`, `moveOutData`.
- Produces: `SERVICE_SLUGS`, `type ServiceSlug`, `serviceBySlug(slug)`, `type ServiceEntry`.

The registry has to express something the spec settled: **six services render through the template, one does not.** Move-out keeps its own five bespoke components, so an entry is either template-driven or bespoke.

- [ ] **Step 1: Write the failing test**

Create `tests/service-registry.test.ts`:

```ts
// tests/service-registry.test.ts
import { describe, expect, it } from 'vitest'
import { SERVICE_SLUGS, serviceBySlug } from '../src/data/services/registry'

describe('service registry', () => {
  it('holds exactly the seven client-specified slugs', () => {
    expect([...SERVICE_SLUGS].sort()).toEqual(
      [
        'airbnb-cleaning',
        'apartment-cleaning',
        'deep-cleaning',
        'move-in-move-out-cleaning',
        'post-construction-cleaning',
        'pre-listing-cleaning',
        'standard-cleaning',
      ].sort(),
    )
  })

  it('resolves a known slug', () => {
    expect(serviceBySlug('standard-cleaning')?.slug).toBe('standard-cleaning')
  })

  it('returns undefined for an unknown slug rather than throwing', () => {
    expect(serviceBySlug('not-a-service')).toBeUndefined()
    expect(serviceBySlug('')).toBeUndefined()
    expect(serviceBySlug('../etc')).toBeUndefined()
  })

  /*
   * These three iterate REGISTERED entries, not SERVICE_SLUGS. Five services
   * are still unimplemented at this point in the plan and resolve to
   * undefined; asserting over all seven now would fail for a reason that is
   * not a defect. Task 5 registers the rest and switches these to
   * SERVICE_SLUGS, at which point they also prove nothing was left unwired.
   */
  const registered = SERVICE_SLUGS.filter((s) => serviceBySlug(s) !== undefined)

  it('registers at least the two services that already exist', () => {
    expect(registered).toContain('deep-cleaning')
    expect(registered).toContain('move-in-move-out-cleaning')
  })

  it('marks move-in-move-out as bespoke and every other registered service as templated', () => {
    for (const slug of registered) {
      const entry = serviceBySlug(slug)!
      expect(entry.kind).toBe(slug === 'move-in-move-out-cleaning' ? 'bespoke' : 'template')
    }
  })

  it('gives every registered templated service a content builder', () => {
    for (const slug of registered) {
      const entry = serviceBySlug(slug)!
      if (entry.kind === 'template') expect(typeof entry.content).toBe('function')
    }
  })

  it('gives every registered service a display name', () => {
    for (const slug of registered) {
      expect(serviceBySlug(slug)!.name.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/service-registry.test.ts`
Expected: FAIL, cannot resolve `../src/data/services/registry`.

- [ ] **Step 3: Write the registry**

Create `src/data/services/registry.ts`:

```ts
// src/data/services/registry.ts
/*
 * The seven services, their URL slugs, and how each one renders.
 *
 * Slugs are the client's, verbatim, and are STORED rather than derived from
 * the display name: "Move In / Move Out Cleaning" does not slugify to
 * "move-in-move-out-cleaning" by any rule worth writing, and the live site
 * already proved that guessing URL patterns from names does not hold.
 *
 * Two kinds of entry. Six services render through the shared template in
 * src/components/service/ and supply a ServiceContent builder. Move-out keeps
 * its own five components, because its structure genuinely differs and putting
 * it on the template would change a page that is live today.
 */
import type { CityContent } from '@/content/types'
import type { ServiceContent } from '@/data/service-types'
import { deepCleaningData } from '@/data/deep-cleaning'

export const SERVICE_SLUGS = [
  'standard-cleaning',
  'deep-cleaning',
  'move-in-move-out-cleaning',
  'apartment-cleaning',
  'airbnb-cleaning',
  'post-construction-cleaning',
  'pre-listing-cleaning',
] as const

export type ServiceSlug = (typeof SERVICE_SLUGS)[number]

export type ServiceEntry =
  | { slug: ServiceSlug; name: string; kind: 'template'; content: (c: CityContent) => ServiceContent }
  | { slug: ServiceSlug; name: string; kind: 'bespoke' }

const ENTRIES: ServiceEntry[] = [
  { slug: 'deep-cleaning', name: 'Deep Cleaning', kind: 'template', content: deepCleaningData },
  { slug: 'move-in-move-out-cleaning', name: 'Move In / Move Out Cleaning', kind: 'bespoke' },
]

export function serviceBySlug(slug: string): ServiceEntry | undefined {
  return ENTRIES.find((e) => e.slug === slug)
}
```

`SERVICE_SLUGS` deliberately lists all seven while `ENTRIES` holds only two. The
constant is the client's contract and is complete from the start; the entries
fill in as services are built. The test above already accounts for this by
iterating registered entries, so it passes as written and tightens in Task 5.

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run tests/service-registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify and stage**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm test
git add -A src tests
```

---

### Task 3: The `/services/<slug>` route

**Files:**
- Create: `src/app/(sites)/[city]/(inner)/services/[serviceSlug]/page.tsx`

**Interfaces:**
- Consumes: `SERVICE_SLUGS`, `serviceBySlug` (Task 2); the template components (Task 1); `moveOutData` and the move-out components.
- Produces: the route itself.

Read the existing `src/app/(sites)/[city]/(inner)/[serviceSlug]/page.tsx` first and follow its conventions exactly: `cityFromParams`, `generateStaticParams` reading cities directly, `dynamicParams = true` so a draft city previews on demand, `generateMetadata` resolving the same way the page does, and `notFound()` for anything unrecognised.

- [ ] **Step 1: Write the route**

Create the file. It must:
- Resolve `serviceSlug` through `serviceBySlug`, calling `notFound()` when undefined.
- For a `template` entry, build `ServiceContent` from the entry's `content(c)` and render the five template sections in the same order and with the same props the current `DeepCleaningPage` uses.
- For the `bespoke` entry, render the existing move-out composition, moved across from `MoveOutPage` in the old route. Do not modify the move-out components.
- Emit `generateStaticParams` returning all seven slugs for each live city, following how the sibling route enumerates cities.
- Emit `generateMetadata` from the entry's `meta` (template) or `moveOutMeta` (bespoke).
- Source every "Set an appointment" CTA from `innerSite.bookUrl`, exactly as the current page does, so a draft city's preview stays inside its own tree.

- [ ] **Step 2: Verify both services render at their new URLs**

With a dev server on 3100:

```bash
for u in /services/deep-cleaning /services/move-in-move-out-cleaning; do
  echo "$u -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3100$u)"
done
# draft city preview
curl -s -o /dev/null -w "draft: %{http_code}\n" http://localhost:3100/miami/services/deep-cleaning
# unknown slug must 404
curl -s -o /dev/null -w "unknown: %{http_code}\n" http://localhost:3100/services/not-a-service
```

Expected: 200, 200, 200, 404.

- [ ] **Step 3: Prove the new deep URL matches the old page byte-for-byte**

The old URL still works at this point, so diff them directly:

```bash
curl -s http://localhost:3100/deep-cleaning-minneapolis > /tmp/old-url.html
curl -s http://localhost:3100/services/deep-cleaning > /tmp/new-url.html
diff /tmp/old-url.html /tmp/new-url.html && echo "IDENTICAL"
```

Expected: identical, or differing ONLY in self-referential URLs (canonical, og:url) if the page emits any. Report the diff verbatim if non-empty; do not dismiss it.

- [ ] **Step 4: Confirm suburb pages still resolve**

```bash
curl -s -o /dev/null -w "suburb: %{http_code}\n" http://localhost:3100/cleaning-services-eagan
```

Expected: 200. The old catch-all route still owns suburb slugs.

- [ ] **Step 5: Verify and stage**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test
fuser -k 3100/tcp
git add -A src
```

---

### Task 4: Redirect the two old URLs

**Files:**
- Modify: `src/app/(sites)/[city]/(inner)/[serviceSlug]/page.tsx`

**Interfaces:**
- Consumes: `cityHref` from `@/content/interpolate`, `permanentRedirect` from `next/navigation`.
- Produces: nothing importable.

Both old slugs are indexed and linked from outside the site, so they must not 404. Read `node_modules/next/dist/docs/` on redirects before writing this — this project runs a modified Next 16 and the redirect helpers' names and semantics must be checked, not recalled.

- [ ] **Step 1: Replace the deep and move branches with redirects**

In `resolveService` / the page component, the `deep` and `move` branches stop rendering and instead redirect permanently to `cityHref(c, '/services/deep-cleaning')` and `cityHref(c, '/services/move-in-move-out-cleaning')`.

`cityHref` matters: a live city redirects to the bare public path, a draft city to `/<cityKey>/services/...`, keeping a preview inside its own tree. A hardcoded `/services/...` would eject a draft preview to the default tenant.

Delete `DeepCleaningPage` and `MoveOutPage` from this file along with their now-unused imports. The suburb branch is untouched.

- [ ] **Step 2: Verify the redirects**

```bash
curl -s -o /dev/null -w "live deep: %{http_code} -> %{redirect_url}\n" http://localhost:3100/deep-cleaning-minneapolis
curl -s -o /dev/null -w "live move: %{http_code} -> %{redirect_url}\n" http://localhost:3100/minneapolis-move-out-cleaning-services
curl -s -o /dev/null -w "draft deep: %{http_code} -> %{redirect_url}\n" http://localhost:3100/miami/deep-cleaning-miami
curl -s -o /dev/null -w "suburb still 200: %{http_code}\n" http://localhost:3100/cleaning-services-eagan
```

Expected: 308 (or whatever permanent status the docs specify for this version) to the matching `/services/...` path; the draft one must redirect to `/miami/services/deep-cleaning`, NOT to `/services/deep-cleaning`. Suburb still 200.

- [ ] **Step 3: Verify and stage**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test
git add -A src
```

---

### Task 5: The five new services

**Files:**
- Create: `src/data/services/{standard,apartment,airbnb,post-construction,pre-listing}.ts`
- Modify: `src/data/services/registry.ts`, `tests/service-registry.test.ts`

**Interfaces:**
- Consumes: `ServiceContent` (Task 1), `t` and `cityHref` from `@/content/interpolate`.
- Produces: five `(c: CityContent) => ServiceContent` builders, registered.

Copy is **placeholder-grade by client instruction** — "just build the template, don't worry about the content". Aim for accurate and service-appropriate, not final marketing prose. It must be rewritable in these files without touching the template.

Follow `src/data/deep-cleaning.ts` exactly as the model for structure and token placement. In particular:
- `hero.h1` is `t("<Service> {city}", c)`
- `whatIs.h2` is static and carries NO city — "What is Standard Cleaning?"
- `benefits.h2` is `t("Benefits of <Service> {city}", c)`
- `services.h2` is `t("<Service> Services {city}", c)`
- `whyChoose.h2` is `t("Why Choose Ivy Cleans for <Service> {city}?", c)`
- the four qualities keep the deep page's titles — Attention to Detail, Safety, On-time, Results — with service-appropriate bodies
- `whatIs.text` is STATIC prose here, not `s(c, ...)`. The five new services get no AI slot; see the spec's §4.4 for why.

Reuse the deep-cleaning page's image paths for every section until real photography exists.

- [ ] **Step 1: Write the five builders**

One file each, each exporting a single builder. Write genuinely service-specific content — an Airbnb turnover page should talk about turnovers, linens and guest-ready standards, not be deep-cleaning copy with the name swapped. If you are unsure what a service involves, say so in your report rather than inventing specifics that could mislead a customer.

- [ ] **Step 2: Register them**

Add the five entries to `ENTRIES` in the registry, each `kind: 'template'` with its builder. Order `ENTRIES` to match `SERVICE_SLUGS`.

- [ ] **Step 3: Restore the full-registry assertions**

Change the iterating tests in `tests/service-registry.test.ts` back to looping over `SERVICE_SLUGS` rather than `ENTRIES`, so the suite now asserts all seven resolve, all seven have a display name, and exactly one is bespoke.

- [ ] **Step 4: Verify every page renders**

```bash
for s in standard-cleaning deep-cleaning move-in-move-out-cleaning apartment-cleaning \
         airbnb-cleaning post-construction-cleaning pre-listing-cleaning; do
  echo "$s -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/services/$s)"
done
# and a draft city
curl -s -o /dev/null -w "draft airbnb: %{http_code}\n" http://localhost:3100/miami/services/airbnb-cleaning
```

Expected: seven 200s and a 200.

- [ ] **Step 5: Check one new page for token leakage**

```bash
curl -s http://localhost:3100/services/airbnb-cleaning | grep -o "{city}\|{citySlug}\|{ST}" | head
```

Expected: no output. An unreplaced token means a string bypassed `t()`.

- [ ] **Step 6: Verify and stage**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test
git add -A src tests
```

---

### Task 6: Point the existing links at the new URLs

**Files:**
- Modify: `src/data/site.ts`, `src/app/(sites)/[city]/(inner)/home/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing importable.

- [ ] **Step 1: Update the two nav hrefs**

In `src/data/site.ts`, the two service nav entries currently build
`cityHref(c, t("/deep-cleaning-{citySlug}", c))` and
`cityHref(c, t("/{citySlug}-move-out-cleaning-services", c))`. Both become the
new static paths through `cityHref`. **Leave the labels alone** — they are
city-templated live copy.

**Do not add nav entries.** `src/components/Header.tsx:15` builds its services
dropdown as `[site.nav[2], site.nav[3]]` and filters `i !== 2 && i !== 3`;
`InnerHeader.tsx` does the same. Adding a third service entry shifts every
index after it and silently breaks both headers. Listing all seven is a client
decision recorded as open item 1 in the spec.

- [ ] **Step 2: Update the home page's two hrefs**

`src/app/(sites)/[city]/(inner)/home/page.tsx` builds `deepHref` and
`moveOutHref` from the same old templates. Point both at the new paths, keeping
the `cityHref` wrapper.

- [ ] **Step 3: Verify no old-pattern link remains**

```bash
grep -rn "deep-cleaning-{citySlug}\|{citySlug}-move-out-cleaning-services" src/ \
  | grep -v "\[serviceSlug\]/page.tsx"
```

Expected: no output. The only surviving references are the redirect matchers in
the old route.

- [ ] **Step 4: Verify links resolve, not redirect**

```bash
curl -s http://localhost:3100/home | grep -o '/services/[a-z-]*' | sort -u
```

Expected: the two new service paths appear. Following them should give 200, not
a redirect — an internal link pointing at a redirect is a smell even when it
works.

- [ ] **Step 5: Verify and stage**

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test
git add -A src
```

---

### Task 7: Full gate and fidelity

**Files:**
- None expected. If this task needs a source change, something earlier was wrong — report it rather than patching here.

- [ ] **Step 1: Run the whole gate**

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Expected: 338 tests plus the registry additions, everything clean. A
`leads-store` failure with `ETIMEDOUT`/`ENETUNREACH` is the sandbox's
intermittent route to Neon; report it as environmental and re-run rather than
changing code.

- [ ] **Step 2: Admin E2E**

```bash
fuser -k 3100/tcp
STUB_MODEL=1 STUB_EMAIL=1 nohup pnpm dev --port 3100 > /tmp/dev-t7.log 2>&1 &
until [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/)" = "200" ]; do sleep 1; done
node scripts/admin-e2e.mjs
fuser -k 3100/tcp
git status --porcelain content/
```

Expected: 42/42 (or 34/34 with one loud skip if the database is unreachable),
and `content/` clean afterwards.

- [ ] **Step 3: Public-site fidelity**

Run the HTML crawler comparison used in earlier rounds. Note the method
recorded in `.superpowers/sdd/2026-08-21-leads-capture-and-crm/shadcn-stage2.md`:
comparing against an older baseline produces false diffs from Turbopack
dev-session chunk naming, so capture a fresh same-session baseline by stashing
the branch's changes, capturing, restoring, and re-running.

Expected: `EQUIVALENT` on every public route EXCEPT
`/deep-cleaning-minneapolis` and `/minneapolis-move-out-cleaning-services`,
which now redirect by design, plus the seven new `/services/...` routes which
did not exist in the baseline.

Report the exact list of differing routes. Any route differing that is not on
that list is a regression and must be explained, not accepted.

- [ ] **Step 4: Report what remains**

Write a short list of what a human should check by hand: the copy on the five
new pages, whether the nav should list seven services rather than two, and
whether `/services` itself should have an index page instead of 404ing.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §3 D1 template is the deep-cleaning shape | 1 |
| §3 D2 deep migrates, move-out does not | 1, 3 |
| §3 D3 all seven under `/services/<slug>` | 2, 3, 5 |
| §3 D4 no trailing slash | Inherited from Next's config; no task changes it |
| §3 D5 permanent redirects | 4 |
| §3 D6 no AI slots for new services | 5 |
| §3 D7 copy written by the implementer | 5 |
| §4.1 template and `ServiceContent` | 1 |
| §4.2 byte-identical proof | 1 step 6, 3 step 3 |
| §4.3 routing, static params, draft previews | 3 |
| §4.4 content approach | 5 |
| §4.5 link updates | 6 |
| §5 verification | 7, plus per-task checks |

**Placeholder scan:** No TBD, no "similar to Task N", no "add error handling".
Task 1's component move is specified as an exact rename list rather than pasted
JSX, deliberately — 451 lines of fidelity-traced markup reproduced in a plan
would be a second source of truth to drift from, and the task is a rename.

**Type consistency:** `ServiceContent` and `ServiceQuality` are defined once in
Task 1 and consumed unchanged by Tasks 2, 3 and 5. `ServiceEntry`, `ServiceSlug`,
`SERVICE_SLUGS` and `serviceBySlug` are defined in Task 2 and consumed by
Tasks 3 and 5. The registry's `content` field returns exactly the
`ServiceContent` Task 1 defines.

**Known ordering constraint:** Task 4 must follow Task 3 — you cannot redirect
to a route that does not exist yet. Task 6 must follow Task 4, or the nav would
point at pages that still redirect.
