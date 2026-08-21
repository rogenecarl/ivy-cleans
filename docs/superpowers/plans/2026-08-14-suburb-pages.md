# Suburb ("Areas We Serve") Pages (Plan 5) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every city gets a real page per researched suburb (e.g. `/cleaning-service-savage-mn` for Minneapolis, `/house-cleaning-coconut-grove` under Miami's preview) — pure token substitution from a fixed template (tokens: the suburb name + the metro city), zero AI cost, byte-faithful to the live site's Savage reference — and the Areas We Serve links go live for generated cities.

**Architecture:** A new `suburbData(c, suburb)` builder holds the template copy byte-verbatim (typos and ’ apostrophes included) from the captured live reference. The existing `(inner)/[serviceSlug]` dynamic segment gains a third legal value class: any stored suburb slug of that city (exact match against `c.research.suburbs`; everything else still 404s). New `src/components/suburb/*` components are styled from the captured `post-664.css` per the repo's fidelity conventions. `finalizeDraft` starts stamping `hasSuburbPages: true`, and the three existing generated cities (miami, houston, minnesota) plus testville are flipped on.

**Tech Stack:** No new dependencies. Existing Next 16 route tree, vitest, Playwright E2E harness, crawler gate.

## Global Constraints

- **NO COMMITS. EVER.** No `git commit`/`git add`. Completion = gates green.
- Never `--update` the pinned snapshots (`data-equivalence` sha256 `dd34c783…`, `book-data` `058bf52a…`). Minneapolis's pinned builders must be byte-unaffected. New pins for NEW tests are allowed.
- Styling rules (AGENTS.md): sizes/colors come from the reference CSS only — find the section's `elementor-element-XXXXXXX` id in `docs/superpowers/reference/ivycleans-live/suburb-savage.html`, grep that id in `post-664.css` (page styles; kit is `post-6.css`). Use explicit arbitrary Tailwind values (`text-[1.8rem]`), never default utilities for sizes that must match. px stays px, rem stays rem. Site font Poppins via the existing setup.
- All user-visible copy lives in `src/data/*.ts`, **byte-verbatim** from `docs/superpowers/reference/ivycleans-live/suburb-savage-content-dump.txt` (typos included, ’ U+2019 apostrophes — straight `'` fails lint). Never paraphrase.
- This is NOT the Next.js you know — check `node_modules/next/dist/docs/` before nontrivial Next work. Tailwind breakpoints in this repo are remapped: lg=1025 / xl=1281 / 2xl=1441 (matches Elementor's 1025 desktop threshold).
- No live API calls anywhere; suburb pages involve no model calls at all.
- Ports: 3100 only (`fuser -k 3100/tcp`, check `ss -lptn`); 3000 off-limits. Playwright borrowed via `PW_PATH=/home/kyousuke/Bajig/Intern-Project/epathways/node_modules/playwright`.
- Live site is compromised (Vavada spam injections): if spam nodes appear in the reference HTML, EXCLUDE them and document the exclusion in a code comment (established convention).
- Gates after every task: `pnpm test` (pins intact) + `pnpm exec tsc --noEmit` + `pnpm lint`. Tasks 2–3 add serving checks; Task 3 adds the crawler procedure and full E2E.

## Reference materials (already captured)

```
docs/superpowers/reference/ivycleans-live/suburb-savage.html          ← live /cleaning-service-savage-mn/ (elementor page id 664)
docs/superpowers/reference/ivycleans-live/suburb-savage-content-dump.txt ← plain-text copy dump (source of byte-verbatim strings)
docs/superpowers/reference/ivycleans-live/post-664.css                ← page styles   (+ post-186.css, post-47.css, post-2282.css also captured; post-6.css = kit)
```

Work In Action images already exist locally: `public/images/rn_image_picker_lib_temp_d129a169-21-1.jpg`, `rn_image_picker_lib_temp_7f5a4f2b-e3-1.jpg`, `Untitled-design*.png` (match the exact ones/order used in the suburb page's gallery from the HTML).

## The template (tokens: {suburb}, {ST}, {city}, {citySlug})

- `<title>`: `House Cleaning Service In {suburb}, {ST}`
- meta description: `Choose Ivy Cleans for superior house cleaning in {suburb} {ST}. Best-in-class home cleaning service awaits. Book your cleaning now!`
- H1 (two lines): `{suburb}, {ST}` / `Cleaning Services`
- Hero paragraph (only the metro is dynamic): `At Ivy Cleans, we specialize in providing exceptional house cleaning services to individuals in {city} and the surrounding areas. We understand the importance of a clean and comfortable living environment, so we are committed to providing top-notch cleaning services that meet your needs.` then `Contact us today to book your quote.` + Set an appointment CTA
- H2 `House Cleaning {suburb} {ST}` + paragraph: `Do you live in {suburb} {ST}? You’re in luck our cleaning services span the entire {city} area. We have been providing the highest quality cleaning services for years. That being said if you want your home to be cleaner, more appealing, and tidy than ever, just give us a call and we can turn your house into a home because a clean home is a place where you can belong.`
- H2 `Benefits of House Cleaning {suburb}` + two static paragraphs (verbatim from the dump, includes "…Ivy cleans specializes in improving the cleanliness of clients’ homes…"), then `There are many benefits to deep cleaning your home in {city}, including:`, then the five static bullets (Reducing the number of allergens in your home / Improving indoor air quality / Preventing the spread of germs and bacteria / Removing stubborn stains and dirt buildup / Creating a more comfortable living environment), then the static eco-friendly paragraph + CTA
- H2 `Our Different Services` → `Other Services Offered In {suburb} Include:` with two links: `Move-Out Cleanings {suburb}` → `/{citySlug}-move-out-cleaning-services` and `Deep Cleaning {suburb}` → `/deep-cleaning-{citySlug}` (both through `cityHref` so draft previews stay in-tree)
- H3 `Our Work In Action` + the gallery images
- H3 `We understand that every home in {suburb} is unique, which is why we offer customized cleaning services to meet your specific needs.` + `Contact us today to discuss your deep cleaning requirements in {city}.` + CTA

EVERY string above must be sourced from the content dump, not retyped from this plan (the plan text is a map, the dump is the truth — exact whitespace/typos matter).

---

### Task 1: suburbData builder (TDD)

**Files:**
- Create: `src/data/suburb.ts`
- Test: `tests/suburb-data.test.ts`

**Interfaces:**
- Consumes: `CityContent` (src/content/types.ts), `cityHref`/`citySlug` (src/content/interpolate.ts), `t()` if convenient.
- Produces (Task 2 relies on these exact names):

```ts
export type SuburbRef = { name: string; slug: string }
export type SuburbData = {
  suburbMeta: { title: string; description: string }
  hero: { titleLines: [string, string]; paragraphs: string[]; ctaLabel: string }
  houseCleaning: { heading: string; paragraph: string }
  benefits: { heading: string; paragraphs: string[]; listIntro: string; items: string[]; closing: string }
  otherServices: { heading: string; intro: string; links: { label: string; href: string }[] }
  workInAction: { heading: string; images: string[] }
  closing: { heading: string; paragraph: string; ctaLabel: string }
}
export function suburbData(c: CityContent, suburb: SuburbRef): SuburbData
```

(Adjust field shapes if the HTML structure demands — but keep the names `suburbData`/`SuburbData`/`SuburbRef` and export them.)

- [ ] **Step 1: failing tests.** In `tests/suburb-data.test.ts` (follow data-equivalence's convention of loading the real minneapolis doc):
  - Savage byte-equality: `suburbData(minneapolis, { name: 'Savage', slug: 'cleaning-service-savage-mn' })` — assert `suburbMeta.title === 'House Cleaning Service In Savage, MN'`, the houseCleaning paragraph `===` the dump's line (read `docs/superpowers/reference/ivycleans-live/suburb-savage-content-dump.txt` in the test and match the exact line containing "Do you live in Savage MN?"), the benefits listIntro contains "in Minneapolis", the two otherServices hrefs are `/minneapolis-move-out-cleaning-services` and `/deep-cleaning-minneapolis`, labels `Move-Out Cleanings Savage` / `Deep Cleaning Savage`.
  - Token behavior: for a draft city (load `content/miami.json`), suburb `{ name: 'Coconut Grove', slug: 'house-cleaning-coconut-grove' }` → title `House Cleaning Service In Coconut Grove, FL`, houseCleaning paragraph contains `Do you live in Coconut Grove FL?` and `the entire Miami area`, links are `/miami/deep-cleaning-miami` etc. (cityHref prefixing for drafts).
  - Purity: two calls with the same args return deeply-equal fresh objects (match the existing data-builder purity convention if such a test pattern exists).
- [ ] **Step 2: run, confirm FAIL.**
- [ ] **Step 3: implement** — template strings byte-copied from the dump with tokens spliced. No `getDefaultCity`, no module-scope city state (builders are pure functions of `c`).
- [ ] **Step 4: full suite green (both pins byte-intact — minneapolis builders untouched).**
- [ ] **Step 5: Gates** (tsc, lint — watch the ’ rule).

### Task 2: components + route + flags

**Files:**
- Create: `src/components/suburb/` components (implementer's decomposition; one per section is the repo norm)
- Modify: `src/app/(sites)/[city]/(inner)/[serviceSlug]/page.tsx` (third resolution branch), `src/content/drafts.ts` (finalizeDraft stamps `hasSuburbPages: true`), `content/{miami,houston,minnesota,testville}.json` (flip `hasSuburbPages` to `true`), and the finalize test expectations in `tests/drafts.test.ts` if they assert `false`.
- Test: extend `tests/drafts.test.ts` (finalize now stamps true)

**Interfaces:**
- Consumes: `suburbData(c, suburb)` from Task 1; `resolveService`/`serviceSlugs` structure in the route file; `siteData(c).innerSite.bookUrl` for CTAs.
- Produces: route now resolves `{ kind: 'suburb', suburb }` for stored slugs; `generateStaticParams` additionally returns each suburb slug when `c.hasSuburbPages`.

- [ ] **Step 1: route.** Extend `resolveService`: after the two service checks, `const suburb = c.research.suburbs.find((s) => s.slug === serviceSlug)` → `{ c, kind: 'suburb' as const, suburb }`; else `notFound()`. `generateMetadata` returns `suburbMeta` for suburbs. `generateStaticParams` appends suburb slugs (only when `c.hasSuburbPages`). Update the file's header comment: the segment now has three legal value classes and still must not swallow typos.
- [ ] **Step 2: components.** Build the page from `suburbData` + `siteData(c).innerSite.bookUrl` for the CTAs, styling traced from `post-664.css` (find each section's `elementor-element-XXXXXXX` id in `suburb-savage.html`, grep the id, cite it in a comment — repo convention). Inner layout is automatic (the route lives under `(inner)`). Exclude any spam-injected nodes found in the reference and note the exclusion.
- [ ] **Step 3: flags.** `finalizeDraft`: `hasSuburbPages: true` in the assembled CityContent (update the drafts test asserting the assembled doc). Flip the four content JSONs by hand (miami, houston, minnesota, testville). Do NOT touch minneapolis.json (already true).
- [ ] **Step 4: serving checks** (dev mode, port 3100): `curl -s -o /dev/null -w "%{http_code}"` for: `/cleaning-service-savage-mn` (expect 200), `/miami/house-cleaning-coconut-grove` (200, draft preview), `/miami/deep-cleaning-miami` (200, unchanged), `/no-such-slug` (404 — rewritten to the default city and rejected), `/miami/no-such-slug` (404). Verify `/cleaning-service-savage-mn` body contains "Do you live in Savage MN?" and the two service links.
- [ ] **Step 5: full gates** (suite, tsc, lint).

### Task 3: fidelity pass + gates re-baseline + E2E + docs

**Files:**
- Modify: `scripts/admin-e2e.mjs` (stubville suburbs are now LINKED; visit one suburb preview), suburb components (fidelity fixes), design spec (As-built), `scripts/.snapshots/` baseline (re-captured)

- [ ] **Step 1: fidelity probes vs live.** Playwright: load `https://ivycleans.com/cleaning-service-savage-mn/` and `http://localhost:3100/cleaning-service-savage-mn` at widths 1920/1440/1280/1025/768/390; for each template section compare geometry (section box, heading font-size/family/weight, paddings, gaps) and grab per-section screenshot crops. Fix all real mismatches (live-wins convention; spam-injection height deltas are documented, not cloned; live may serve stale/odd artifacts — canonical file wins, per the FEATURED IN lesson). Iterate on localhost; hit the live host once per width (it is slow).
- [ ] **Step 2: crawler.** Prod build + `pnpm start --port 3100`. First `node scripts/snapshot-pages.mjs compare` — the ORIGINAL 11 routes must show NO diffs (suburb links on / and /home were already in the HTML for Minneapolis, so the existing pages must be byte-identical; any diff there is a defect). Then `node scripts/snapshot-pages.mjs baseline` to capture the enlarged route set (the crawler follows the 24 new Minneapolis suburb links), then `compare` → `EQUIVALENT (N routes)` with N ≈ 35. Record N in the report.
- [ ] **Step 3: E2E.** Update `scripts/admin-e2e.mjs`: the "suburbs render unlinked" check inverts — stubville now finalizes with `hasSuburbPages: true`, so assert the three fixture suburbs ARE links carrying the `/stubville/` prefix; add a step visiting one fixture suburb page (use the fixture's stored slug) asserting 200 + its H1 contains the suburb name + the two "Other Services" links are `/stubville/`-prefixed. Run the full E2E under `STUB_MODEL=1 pnpm dev --port 3100` — all checks green; content/ restored byte-perfectly (cleanup untouched: suburb pages create no new files).
- [ ] **Step 4: docs.** Append "As built (Plan 5)" to the design spec: the third slug class, the template/token model, hasSuburbPages semantics (finalize stamps true; operator can still edit the suburb list on review — pages follow the stored slugs immediately), and the note that suburb pages are AI-free.
- [ ] **Step 5: full gates one final time.**

---

## Self-review notes

- User-dictated mapping (2026-08-14, recorded in the content-list spec) is fully covered: two tokens, all sections, CTA/link targets, images static.
- Type consistency: `SuburbRef`/`SuburbData`/`suburbData` (T1) consumed by the route + components (T2); `hasSuburbPages` flips feed `generateStaticParams` (T2) and the E2E inversion (T3).
- The pinned minneapolis data-equivalence hash is untouched by design: `suburbData` is a NEW builder; no existing builder changes shape.
- Route-collision safety: static sibling segments (blog, contact, faq…) win over the dynamic segment in Next matching; unknown slugs still 404 via exact-match resolution.
