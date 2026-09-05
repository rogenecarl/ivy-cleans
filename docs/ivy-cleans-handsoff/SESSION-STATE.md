# Where this work stands — 2026-09-01

Written to hand the generator work to a fresh session. Read this first, then
`content-strategy.md` for what remains.

---

## The one-line state

The seven handoff changes are merged and pushed. Content-strategy items
**B (voice) and A (ops block) are both DONE**. Houston has been generated
against the real model twice, and the flaw the first run exposed is fixed and
verified — see "The real Houston run" below. **D (validators) is next.**

```
origin/main   cf51936   (everything pushed, nothing local-only)
suite         660 tests, 0 failures     pnpm test
typecheck     clean in src/             pnpm tsc --noEmit
duplication   0 live findings           node scripts/check-duplication.mjs
```

`tests/leads-store.test.ts` fails intermittently — it hits a real remote Neon
database over the network. It is not related to any of this work. Re-run
before investigating; it passes on retry.

---

## What is merged on `main`

The original seven changes, less two:

| # | Change | State |
|---|---|---|
| 1 | Research schema carries conditions + subdivisions | done |
| 3 | The suburb stage — three generated paragraphs per area | done |
| 4 | Uniqueness gate + score chips in the review screen | done |
| 5 | Cross-city similarity check, refused at publish | done |
| 6 | `home` stage deleted, ZIPs demoted to a list | done |
| 7 | One slug pattern for new cities | done |
| **2** | **Keywords from DataForSEO** | **NOT STARTED — needs credentials** |
| **8** | **OpenSEO** | **excluded by the user** |

Plus, on top:

- an invisible-character guard at publish (`1a02215`)
- the suburb stage driven one area per request (`13b2fcc`) — see Traps
- the voice rewrite, content-strategy item B (`285a186`)

**Three data-loss bugs were found and fixed that were in neither the handoff
nor the plan.** All the same shape: a function rebuilding a `Suburb` literal
from parts instead of spreading it, dropping `subdivisions` /
`housingCharacter` / `conditions`. All harmless until the schema grew, then
armed simultaneously. `updateSuburbsLogic` (`91125df`), `normalizeResearchSlugs`
(`98a1104`), the draft sidecars (`ca9c52c`).

---

## A is complete

`MarketOpsSchema`, `Facts.ops`, `opsBlock` in all four content prompts, the
`SYSTEM_BASE` carve-out, five form fields on the new-site screen, `parseZips`,
and `finalizeDraft` preferring `ops.zips` with `research.zips` as the fallback.

That fallback must stay: Minneapolis carries 25 ZIPs recovered from prose
during the migration and its operator has never filled the new field.

**ZIPs are out of research entirely** — part (d) is gone from the brief and
`zips` from the structuring prompt. "Which ZIPs exist near Houston" is a search
result; "which ZIPs does this branch serve" is a decision only the owner can
make. The research pass said so itself, in the persisted findings:

> "(d) ZIP codes and (e) keywords — I could not research at all, and I have
> deliberately left them empty rather than reconstruct them from memory."

Keywords keep their part in the brief, relettered (d), until DataForSEO lands.

## The real Houston run — what it proved

`npx tsx scripts/generate-city.mjs houston` — 7 calls, 122K in / 22K out,
**$1.18**, 6.2 minutes. `--dry-run` verifies auth and the plan without spending.

**Cost was 2x my estimate.** Research alone is ~106K input tokens because web
search pulls page content into context. Budget **$1–1.50 per city**, not $0.60.
At 100 sites that is ~$120.

### Worked

- **The pages read as different places.** The project's own sibling check on
  Katy vs Sugar Land: `intro` 0.018, `homes` 0.000, `local` 0.000 — all far
  under the 0.75 threshold. Real checkable facts: Kelliwood's grout gone gray,
  Seven Meadows' golf-course lots, Firethorne building across 1,400 acres since
  2005, versus First Colony's 16,799 homes and Telfair's 70-acre lake.
- **The voice rewrite worked.** Zero banned phrases. `assertively declare` and
  `unmatched` — both in the old Houston copy — are gone.
- **`copySafe` worked on real data.** Research surfaced "Telfair HOA dues run
  $750 to $1,900 per year" and "Median sales price of $370,000", marked both
  `copySafe: false`, and neither reached the copy.

### The flaw — found, fixed, and verified

The FIRST run closed every area page on the same three facts — humidity, air
conditioning, spring pollen — and none of those words appeared in any
researched condition. `research.conditions` was empty, so the model filled the
gap from general Houston knowledge, which is identical for every area, so the
pages converged.

The structuring fix (`2d59e22`) addressed the root cause and the SECOND run
(`89e75bc`, $0.63) confirms it. Research now supplies six real metro
conditions and every closing fact traces to one: mold spore counts hitting the
extreme category in late January, tree pollen from February, air conditioning
running nearly all year. The model stopped inventing because it no longer had
a gap to fill.

The pages also lead with what only that area has, as the prompt asks — Katy on
backyard pools and greenbelt frontage making the back door the dirtiest door;
Sugar Land on clippings and turf chemistry from the Sweetwater course.

**Six areas now, not three.** The Woodlands, Pearland, Memorial and Missouri
City clear the gate because the structuring fix surfaced 37 subdivisions where
there had been 16. Worst sibling similarity across all six areas and all three
paragraph kinds: **0.068**, against a 0.75 threshold.

**Still untested: the ops block.** Houston predates it and has no ops data.
Testing it needs real facts for a real market — a crew lead's first name, a
homes-cleaned count, two reviews. Inventing them to exercise the feature is
the failure this project exists to prevent.

### The measured effect of `2d59e22`

Re-running research only, after the structuring prompt was rebalanced:

```
                before → after
areas kept          3 → 6
metro conditions    0 → 6
subdivisions       16 → 37
zips                0 → 0    (never a transcriber problem — see below)
keywords            0 → 0
```

**Why ZIPs and keywords stayed zero**, in the research pass's own words, now
visible because findings are persisted:

> "(d) ZIP codes and (e) keywords — I could not research at all, and I have
> deliberately left them empty rather than reconstruct them from memory."

The transcriber was right to return empty arrays. The search brief asked for
five things on a budget that covered three. ZIPs are now an operator field and
part (d) is gone, so the three remaining parts have the whole budget.

---

## Current draft state

`content/_drafts/houston.json` — fully generated and committed (`89e75bc`).
`done: ['research','front','deep','suburb']`, 6 areas, 6 metro conditions,
37 subdivisions, 26 sections, 16,284 chars of persisted findings.

This draft IS the evidence. Read `suburb.katy.local` against
`suburb.sugar-land.local` to see what the pipeline now produces; every
closing fact in both traces to a researched metro condition.

`content/_drafts/miami.json` — still the migrated shape, all areas with zero
subdivisions, so the gate refuses them all. Needs research re-run before it can
produce area pages.

`content/minneapolis.json` — the only `status: live` document. 24 areas, all
with empty researched fields from the migration, so all score 0 on the gate.
That is correct, not a failure. 25 ZIPs backfilled from the prose that was
deleted.

---

## Traps — things that will bite a fresh session

**Serverless timeouts.** The suburb stage makes one model call per area.
Running the whole stage in one request is 3–6 minutes and Vercel kills it. The
admin now drives it **one area per request** via `runStageAction(key,
'suburb', slug)` and `pendingSuburbsAction`. Task 9's DNS/TLS poll has the same
shape — up to ten minutes — and must not live in a request either.

**`isWritableArea` has five call sites and one definition** in
`src/content/slots.ts`. The loop's skip, `stageComplete`, `stageSlots`,
`buildSuburbPrompt`'s guard, and `scoreSuburbs` all use it. If any one
disagrees, an area is either demanded by finalize and never written (finalize
refuses forever) or written and never required. This deadlock has been
introduced and fixed three times.

**No min/max/length constraints in `src/pipeline/schemas.ts`.** The
structured-output API rejects them and **no test here catches it** — it fails
on the first real API call with a green suite. `MarketOpsSchema` is the one
exemption and says so: it validates operator input, never model output.

**Prompt text is product copy.** Copy it exactly from
`docs/ivy-cleans-handsoff/patches/stages-patch.ts`; do not paraphrase. A
reworded constraint is a changed constraint.

**Tests write into the real `content/` directory.** Prefix keys `ztest-`,
snapshot and restore `_cities.json` and `_domains.json`. Two tests have now
broken because they asserted on live draft state that a real generation run
legitimately changed — assert shape, not snapshots.

**Never `git add -A`.** Unrelated working-tree files have been swept up before.

---

## Deferred, with reasons

| Item | Why not now |
|---|---|
| **The suburbs-editor seam** | A hand-added row gets `subdivisions: []`, which either blocks finalize or publishes the Savage template verbatim — invisible to `checkCity`, which only reads `sections`. Needs a design decision, not a patch. **The largest unclosed hole.** |
| `notesBlock` unsafe content | Forbids prices and competitor names but not flood risk, crime or income — the one route by which `copySafe: false` material could reach copy. Pre-existing, shared by three prompts. |
| `saveDraft` non-atomic | Plain `writeFile`, no write-then-rename. Pre-existing; the suburb loop now writes N× more often. |
| `scripts/check-duplication.mjs` duplicates `similarity.ts` | Including hard-coded thresholds. Standalone-by-design, but a drift hazard. |
| `docs/ai-prompts.md` sync unenforced | Content is correct today; no test pins it against the source constants. |
| Service-in-city pages | 12 areas × 7 services = 84 pages of a type not yet proven. |

---

## What to do next, in order

1. **D — validators** (`src/content/quality.ts`, ½ day). Entity coverage,
   ops-facts-used, banned phrases. This is what turns A from advisory into
   enforced. `BANNED_PHRASES` is already exported from `stages.ts` for it.
4. **C — service local sections** (1 day).
5. **E — evals** (1 day).
6. **Change 2 — DataForSEO** whenever credentials exist. The seam is built:
   `buildResearchStructuringPrompt` takes a keywords argument and branches on
   it, so it is one call-site change plus deleting part (d) of the brief.
5. **Task 9 — domains.** It automates publishing; the pages are now worth
   publishing, so this is no longer blocked on evidence — only on priority.

---

## Package inconsistency worth resolving with Abdi

`WHAT-CHANGED.md` says to delete `patches/domain-provision.mjs` as superseded.
The new `README.md` done-when list says the Search Console property is "created
and verified by `domain-provision.mjs`". `domain-automation.md` says Search
Console is out of scope. Three statements, two contradictions. Ask which is
current before following that checklist.

Also: his message and the README both say to do changes 1, 5 and 3 first.
Those are merged. The live sequence is content-strategy steps 2 through 7, and
step 3 (voice) is done too.
