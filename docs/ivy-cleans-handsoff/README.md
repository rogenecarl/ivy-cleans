# ivy-cleans — engineering handoff

Seven changes to the site generator, plus one infra task. Nothing here restructures the app; the architecture is sound and most of it stays untouched.

---

## Why

The generator produces ten AI-written slots per city, all on the front page, the home page, and one deep-cleaning paragraph. **Area pages — the ones the whole location model depends on — are pure token substitution.** `src/data/suburb.ts` says so in a comment.

We have sixteen months of Search Console data for exactly that page type on the live Minneapolis site:

| | |
|---|---|
| Area pages live | 24 |
| Impressions | 97,649 |
| **Clicks** | **23** |
| Average position | 45.9 |
| Pages with zero clicks ever | 13 |

Google indexes them and matches them to real queries. They sit on page five because there is nothing on any one of them that isn't on the other twenty-three.

Copy is also already leaking between cities. Run `node scripts/check-duplication.mjs` after dropping it in — **8 findings across Houston, Miami and Minneapolis**, worst being 116 characters shared verbatim.

---

## Read in this order

1. **`builder-review.md`** — what the codebase does today, what's good in it, and the eight findings. Start here.
2. **`change-list.md`** — all seven changes, why each, and what's explicitly deferred.
3. **`patches/`** — the code.
4. **`stage-c-prompts.md`** — the page-type ownership rule and the banned-phrasings list. Background for the prompt work; not all of it applies yet.
5. **`openseo-setup.md`** — task 8, standing up our SEO research tool. Independent of the seven changes; parallelisable.

---

## The changes, in order

| # | Change | Files | Rough effort |
|---|---|---|---|
| 1 | Research schema carries conditions + subdivisions | `schemas.ts`, `stages.ts`, `types.ts`, `validate.ts` | half day |
| 5 | Verbatim-run check | new `similarity.ts` + `scripts/` | 2 hours |
| 3 | **The suburb stage** | `stages.ts`, `schemas.ts`, `drafts.ts`, `data/suburb.ts` | 1–2 days |
| 4 | Uniqueness gate wiring | `admin-logic.ts`, `review/[key]/`, `suburbs-editor.tsx` | half day |
| 6 | Retire landmarks, demote ZIPs | 11 files — full list in `changes-4-and-6.md` | half day |
| 2 | Keywords from DataForSEO not the model | new `keywords.ts` + `stages.ts` · see `change-2-wiring.md` | half day |
| 7 | One slug pattern, new cities only | `stages.ts` | 1 hour |
| 8 | **Stand up OpenSEO + provision projects** (infra, no repo changes) | see `openseo-setup.md` | 1 day |

Do 1 before anything else — everything depends on the schema. Do 5 second because it's cheap and it catches regressions in 3. Task 8 touches no repo code and can run in parallel or go to someone else.

**On tooling:** we're dropping Ahrefs and using OpenSEO (self-hosted, MCP) for research and measurement. This changes nothing in the pipeline — OpenSEO has no REST API, so `keywords.ts` still calls DataForSEO directly. One DataForSEO account, two independent consumers.

### Files in `patches/`

| File | What it is |
|---|---|
| `schemas.ts` | Drop-in replacement for `src/pipeline/schemas.ts` |
| `stages-patch.ts` | Numbered blocks for `src/pipeline/stages.ts` — replacements and additions, with placement notes. Not a drop-in file. |
| `similarity.ts` | New `src/content/similarity.ts` |
| `check-duplication.mjs` | New `scripts/check-duplication.mjs`. Runs standalone today, exits 1 on findings so it can go in CI. |
| `changes-4-and-6.md` | Wiring for 4 and 6, with the full file sweep |
| `keywords.ts` | New `src/pipeline/keywords.ts` — the DataForSEO client, shaped like the existing `ModelClient` seam |
| `keywords-probe.mjs` | New `scripts/keywords-probe.mjs`. Verifies credentials and prints real volumes before any wiring. Run it first. |
| `change-2-wiring.md` | Change 2 end to end: credentials, where it plugs in, caching, and the geo-targeting decision |
| `openseo-provision.mjs` | Bulk-creates OpenSEO projects + rank trackers from a markets file. `--dry-run` first — not yet run against a live instance |

Plus **`openseo-setup.md`** at the top level — task 8, infra only.

---

## One live bug to fix first

`updateSuburbsLogic()` does `draft.research = { ...draft.research, suburbs }`. Under the old schema a `Suburb` was `{name, slug}`, so replacement was fine. Under the new one it wipes `subdivisions`, `housingCharacter` and `conditions` every time an operator saves the suburbs editor.

`mergeSuburbRows()` in `changes-4-and-6.md` fixes it. Land it with change 1, not after.

---

## Do not change

These are right and were got right deliberately:

- **`facts.ts`** — phone and state derived in code, fuzzy matching rejected on purpose
- **The two-pass research split**, and keeping the transcriber off `SYSTEM_BASE`
- **`notesBlock()`** treating operator notes as data, not instructions
- **`reservedSlugs()` / `normalizeResearchSlugs()`** — extend, don't replace
- **Resumability**, `regenerateStage`, downstream clearing
- **The `ModelClient` seam** and `STUB_MODEL=1`
- **Draft → review → publish** with per-stage regenerate
- **`docs/ai-prompts.md`** — keep it current, it's how a non-engineer stays in the loop

---

## Decisions to raise, not guess

1. **`STAGE_SLOTS` becomes dynamic.** Suburb slots are three per area and the count isn't known until research runs. Function of the draft, or a separate namespace the union test ignores? Either works; pick one before writing the loop.
2. **Renaming an area keeps its research.** `mergeSuburbRows` matches on slug, so changing "Katy" to "Cypress" without changing the slug inherits Katy's subdivisions. Consistent, but worth a documented rule or an editor hint.
3. **Where the similarity check blocks** — `finalizeDraft` or `publishCity`. I'd say publish, so an operator can look at findings in the review screen first.
4. **`Locations.tsx` loses a section.** Their comment says the four-section split is what produces the Elementor widget gutters. Check the rendered spacing against the reference rather than assuming.
5. **Minneapolis migration timing.** Every area there will score 0 on the uniqueness gate because there's no researched local material on it. That's the correct answer, not a migration failure.

---

## Done when

- [ ] `pnpm test` green — the `STAGE_SLOTS` union pin and stub fixtures both need updating for the new stage set
- [ ] A city generates end to end: research → front → deep → suburb
- [ ] Each area page names **at least three real subdivisions** from its own research
- [ ] `node scripts/check-duplication.mjs` reports **zero ZIP-sentence findings**
- [ ] Sibling area pages within one city score under 0.75 similarity
- [ ] The review screen shows a score chip per area, and names any area the gate dropped
- [ ] Regenerating `research` clears `suburb` along with `front` and `deep`
- [ ] `content/minneapolis.json` migrated; `houston.json` and `miami.json` regenerated; `testville.json` updated
- [ ] OpenSEO running, and `get_backlinks_overview` verified against a known domain before Ahrefs is cancelled
- [ ] `openseo-provision.mjs --dry-run` reviewed, then one market provisioned by hand to confirm the MCP argument names before bulk-running it
- [ ] Search Console property connected per project as each site launches — this is the kill-rule data source and it is manual

The last real test is not in that list: **generate Houston, then read the Katy and Sugar Land pages side by side.** If a paragraph would sit unchanged on either, the research isn't being used and the prompt needs another pass. That judgment can't be automated, and it's the one that decides whether this works.

---

## Deferred — don't build these yet

| Item | Why not |
|---|---|
| Service-in-city pages (`/katy/deep-cleaning/`) | 12 areas × 7 services = 84 more pages of a type that can't differentiate yet. Revisit once 12 area pages prove out. |
| Generating the other six service pages | Real, but area pages are the constraint. Next after change 3. |
| `source_url` per researched fact | The transcriber prompt covers most of the risk |
| URL hierarchy change on Minneapolis | Indexed URLs, real redirect cost, no current benefit |
