# Where this work stands — 2026-09-01

Written to hand the generator work to a fresh session. Read this first, then
`content-strategy.md` for what remains.

---

## The one-line state

The seven handoff changes are merged and pushed. Content-strategy items
**A (ops block), B (voice), C (service local sections), D (validators) and
E (evals) are DONE**, and A's
three reachability holes are closed — see "A is complete" below. Houston has been generated
against the real model twice, and the flaw the first run exposed is fixed and
verified — see "The real Houston run" below. **The whole content strategy is
in, less change 2 (needs credentials). Next is Minneapolis — see the bottom.**

```
origin/main   6973e8a   (last pushed commit)
suite         744 tests, 0 failures     pnpm test
typecheck     clean in src/             pnpm tsc --noEmit
lint          0 errors, 14 warnings     pnpm lint   (all pre-existing)
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

### The three holes in A, now closed

A was specified and wired but not reachable. Three gaps, all found by reading
the flow end to end rather than by a failing test:

1. **`reviews` could not be entered anywhere.** `MarketOpsSchema` accepted
   them and `opsBlock` prompted with them — *"quote at most two, verbatim"* —
   and no form field existed. The single most valuable ops fact was
   unreachable through the UI. Now a textarea on `/admin/new`, parsed by
   `parseReviews`: `quote | first name | area | date?`, one per line. The
   separator is a pipe because real reviews are full of commas and dashes.
2. **Ops were create-time only.** `sites/[key]/settings-form.tsx` had no ops
   fields at all, so a crew lead hired after launch had nowhere to be
   recorded. Now `OpsForm` on `/admin/sites/<key>`, backed by
   `readOpsLogic` / `updateOpsLogic` / `saveOpsAction`.
3. **Ops were destroyed by publishing.** They lived only on the draft
   sidecar, and `publishCity` deletes it. `CityContent.ops` now carries them
   onto the published document, `finalizeDraft` writes it and
   `validateCityContent` checks it — which is also what lets (2) work on a
   live city, the only kind that has real ops facts to edit.

Two rules the parsers follow, both deliberate and both tested:

- **`parseReviews` REJECTS a bad line; `parseZips` DROPS one.** A malformed
  ZIP is unambiguous junk among dozens and guessing would put a visible error
  on a live page. A review is a paragraph a human typed once, from a real
  customer — losing one silently is unrecoverable, so a bad line fails the
  whole save with the line number the operator's cursor is on.
- **`parseOpsForm` refuses an ABSENT field rather than reading it as
  cleared.** The same line `parseNotifyEmails` draws, for a worse failure:
  `saveOpsAction` replaces the whole ops block, and on a live city there is
  no sidecar left to recover from.

Still true: `crewLead` etc. reach the copy only through `opsBlock`. Saving a
fact changes what the NEXT generation is given — it does not rewrite pages
already written. The screen says so.

## C is complete

Six of the seven service pages were byte-identical in every city — only
`deep.whatIs` was generated, and `src/data/services/*.ts` said so in a comment.
Each of the six now carries one 90–130 word paragraph saying what this city
changes about that job.

- **A fifth stage**, `service`, after `suburb`. Slots `service.<slug>.local`,
  one per template service. Regenerating `research` clears it.
- **`buildServiceLocalPrompt`** — Abdi's text, plus `opsBlock`/`notesBlock`,
  fed the `copySafe` metro conditions. The conditions section is OMITTED when
  empty, never emitted blank: that is what made the first Houston run invent
  the same three facts for every area.
- **Rendered as a second `<p>` inside `WhatIs`**, not a new section. The
  layout is traced byte-for-byte to the live Elementor design and a new
  section would mean deriving spacing with no reference to derive it from.
- **`move-in-move-out-cleaning` is excluded.** It is the registry's one
  `bespoke` entry, with its own five components, live on Minneapolis today.
  `buildServiceLocalPrompt` throws if asked for it.
- **One request per service**, like the suburb stage — `pendingServicesAction`
  plus a client loop. Six calls in one request is minutes and Vercel kills it.

### The cap, and why it is load-bearing

The first real run exposed the same convergence the area pages hit, one level
up. Every service receives the IDENTICAL metro condition list — only the
service name differs — so with no instruction to select, the safe move is to
cover all of them:

```
                        before → after      (measured, $0.17 each)
conditions used, per page  4,4,3,2,4,4 → 1,2,1,2,2,2
worst sibling similarity      0.054 → 0.004
longest shared verbatim run   61 ch → 24 ch
```

Sixty-one characters is over the 60-char floor `check-duplication.mjs` uses
between cities. **Shingle similarity did not catch this**: 0.054 against a
0.75 threshold, because the wording varied and only the substance repeated.
The tell was that the two best sections were the two that used the fewest
conditions.

The fix is one line — "use AT MOST TWO of the conditions above and ignore the
rest". Quality went UP, not down: each page now carries a service-specific
CONSEQUENCE rather than a shared list. Post-construction on drywall dust
pulling moisture out of the air and smearing under a damp cloth; pre-listing
on timing the final wipe close to the first showing because pollen returns
within days; standard on using a damp cloth rather than a duster because dry
dusting moves pollen onto the floor you just did.

Humidity still appears on all six, correctly — it is the dominant Houston
condition for cleaning — but each page draws a different consequence from it.
Using one condition six ways is the goal; using four conditions the same way
six times was the defect.

Two corrections to the handoff, both load-bearing:

1. **`content-strategy.md` says to read the slot with `s(c, ...)`. That would
   500 every service page on Minneapolis**, which is live and has none of
   these slots — `s()` throws on a missing slot. The builders use `sOpt`.
2. The doc says "seven calls" in one place and "the six static builders" in
   another. It is six; move-out is bespoke.

**`REQUIRED_SLOTS` grew by six.** Service slots do not depend on research —
the same seven services exist in every city — so they sit with the
research-free base rather than with the suburb slots. Consequence: **Houston's
committed draft is not finalizable until its service stage runs.** That is
correct, and `npx tsx scripts/generate-city.mjs houston` will do it.

`StubModelClient` now counts `usage.calls`. It never did, so every
"a resumed stage does not pay twice" assertion had been holding at 0 === 0.

## D is complete

`src/content/quality.ts` — three mechanical checks on a finished document,
run at publish and shown on the review screen.

| Rule | Blocks publish | Catches |
|---|---|---|
| `entity-coverage` | yes | an area page that never named its own subdivisions |
| `ops-unused` | yes | a supplied crew lead or homes-cleaned count the copy ignored |
| `banned-phrase` | no | the sixteen tells from `SYSTEM_BASE`, checked mechanically |

Run against the real cities:

```
houston (draft)      0 findings
minneapolis (LIVE)   3 warnings — "meticulous", "assertively declare", "unmatched"
                                  all in services.heroParagraphs
```

Those three are the live Minneapolis hero — the page at position 33 that
content-strategy.md names as the wrong exemplar. The validator found them
independently.

### Four decisions that differ from the sketch

1. **`checkQuality(doc)` takes only the document.** `ops` lives on
   `CityContent` now, so no `facts` argument is needed — which is what lets it
   run at publish, where the sidecar is already deleted.
2. **Ops facts are checked across the WHOLE document**, not the `services.*`
   slots the sketch reads. A crew lead named on an area page has been used,
   and a validator that cries wolf is one an operator clicks past.
3. **Only `crewLead` and `homesCleaned` are enforced.** `servingSince` arrives
   as "2024-03" and the prompt asks for it plainly, so a correct page writes
   "March 2024"; `crewSize` can be spelled as a word; reviews are quoted "at
   most two", so none is inside the instruction. All three would false-alarm.
4. **Reading level and the "once per page" rules are omitted**, with reasons in
   the file header: an inaccurate Flesch score is noise, and "per page" has no
   honest definition against a slot model.

**`BANNED_PHRASES` moved to `quality.ts`**, and `stages.ts` imports it from
there. It could not stay: stages.ts imports `drafts.ts`, and `drafts.ts` now
imports the validator — content → pipeline would close the loop. One
definition, imported downhill.

### A prompt defect found while building it

`scoreSuburbs` only rejects an area with ZERO subdivisions, so one- and
two-subdivision areas reach `buildSuburbPrompt` — which said *"use at least
three of these by name"* while listing fewer than three. An impossible
instruction is an invitation to invent the third. The prompt now asks for
`min(3, n)`, and the validator checks the same number.

## E is complete

`evals/` — three fixtures, one runner, results committed per run.

```
npx tsx evals/run.mjs                 every fixture
npx tsx evals/run.mjs houston-tx      one
npx tsx evals/run.mjs --dry-run       plan and cost, no spend
npx tsx evals/run.mjs --no-rubric     mechanical checks only
```

Exits non-zero on a failed check, so it can gate a merge. Run it before
merging any prompt change.

### Frozen research — the deliberate departure from the spec

`content-strategy.md` says "runs the full pipeline against each fixture".
This runs everything EXCEPT research, from research frozen into the fixtures.

- **Cost.** Research is ~$1.06 of the $1.35 a city costs. Full-pipeline evals
  are ~$7 a run; these are ~$1.50. An eval nobody runs has no value.
- **Determinism.** Live web search returns different results week to week. A
  suite whose inputs move cannot tell you whether the prompt improved or the
  search did.
- **It is not what changes.** Prompt work lands in front/deep/suburb/service.

Re-freeze deliberately after a research-brief change: regenerate for real with
`--stage research --regenerate`, then copy the draft's `research` into the
fixture.

### The fixtures

All research is REAL, produced by the actual research stage against the actual
web. Nothing about a place is invented.

| Fixture | For |
|---|---|
| `houston-tx` | the rich case — 6 areas, 37 subdivisions, 6 conditions |
| `miami-fl` | the thin case — 11 areas, ZERO subdivisions; the gate must drop all of them |
| `houston-ops` | Houston's research plus an ops block, to test the one thing no real run has: does a supplied operator fact reach the copy |

**`houston-ops` carries invented ops facts, and that is the point.** Inventing
operator facts about a market that really operates is the failure this project
exists to prevent — and no market being generated is operating yet. A fixture
that is obviously a fixture, under `zeval-` keys the runner deletes, is the
only honest way to exercise the ops block against a real model.

### The rubric is the reason this exists

Every mechanical check in the harness would have PASSED the six converged
service sections. Entity coverage fine, no banned phrases, similarity 0.054
against a 0.75 threshold — four of six pages running the same four facts in
the same order. Only reading them found it.

So a second model call grades each area page 1-5 on *"would a resident
recognise their own neighbourhood?"*, and anything under 4 fails the run. It
is deliberately NOT given the research: a resident does not know what the
pipeline was told. Handing the grader the source material turns it into
"did this use its inputs", which `quality.ts` already answers.

Not checked: reading level, for the same reason it is out of `quality.ts`.

### The first real run found two defects

`$2.13, 48 calls, 3 fixtures.` Above the $1.50 estimate — the rubric adds
twelve calls whose reasoning output is long.

```
houston-tx    ✓ gate  ✓ entities+ops  ✓ banned  ✓ siblings 0.047   ✗ rubric 4.5
houston-ops   ✓ gate  ✓ entities+ops  ✓ banned  ✓ siblings         ✗ rubric 4.2
miami-fl      ✓ gate (0 of 11 built)  ✓ all mechanical checks
cross-fixture ✗ six shared runs of 60+ chars
```

**1 · Missouri City scores 3 in both runs, and the reason is research, not
prose.** The grader:

> "Two real names (Lakes of Brightwater, the First Colony sections) dropped
> into copy that is otherwise pure Houston-metro boilerplate … the page
> ignores what actually distinguishes Missouri City (Sienna, Quail Valley's
> older golf-course homes, Hunters Glen/Fondren Park, the Fort Bend–Harris
> split)."

And a factual error it caught that nothing else could:

> "First Colony is generally understood as Sugar Land, not inside Missouri
> City limits, which a resident would flag."

**`entity-coverage` counts names; it cannot tell you they are the RIGHT
names.** Missouri City passed every mechanical check with subdivisions that
are thin and partly misattributed. This is precisely the gap the rubric was
added for, and it found it on the first run.

**2 · The front page still shares long verbatim runs across cities.**
`services.heroParagraphs` 83 chars, `services.serviceIntro` 82,
`deep.whatIs` 73 — all Houston ↔ Miami. `check-duplication.mjs` reports zero
on LIVE cities only because Minneapolis is the only live one. The front-page
and deep prompts were never part of changes 1–7, and `content-strategy.md`
section F explicitly deferred the front page. This is that deferral, measured.

**One harness flaw the run exposed in itself**, now fixed: houston-ops is
houston-tx's research with an ops block, so cross-comparing them was
comparing a city to itself. Same-city fixtures are now skipped.

### A failed fix, kept as a finding — do not repeat it

Missouri City's page is weak because its RESEARCH is weak, not its prose. The
diagnosis is settled: the persisted `findings` never mention Sienna, Quail
Valley, Hunters Glen, Fondren Park, Hunters Creek, Piney Point or Bunker Hill.
The structuring pass transcribed faithfully. Subdivisions per area, in list
order, were:

```
Katy 6 · Sugar Land 12 · Pearland 6 · The Woodlands 10 · Missouri City 2 · Memorial 1
```

That is budget exhaustion down the list, not a bad area.

**The attempted fix, and its measured result.** The brief already said "aim for
3 to 6 per area" — an aim with no accounting is an average, and an average
hides the tail. So part (b) was strengthened: three as a floor for EVERY area,
search each area separately, give the eighth the same effort as the first, and
report a per-area count with "FEWER THAN THREE FOUND" where it fell short.

Re-running Houston research cost **$1.45** (199K input tokens) and produced:

```
                subdivisions        metro conditions
Katy             6 →  7
Sugar Land      12 → 10
Pearland         6 → 12
The Woodlands   10 → 21
Cypress          — →  6     (new; Memorial gone)
Missouri City    2 →  2     ← the thing the change was for
total           37 → 58              6 → 0
```

**Net negative, and reverted.** Subdivisions improved substantially and metro
conditions went to ZERO — the exact state that caused the original convergence,
where every area page closed on invented humidity, A/C and pollen. Per-area
conditions rose (Katy 3→5, Sugar Land 3→5) while metro-level emptied, which
also starves the service local sections: they read ONLY `research.conditions`,
so all six would have had no conditions section at all.

**The lesson, which is the durable part: emphasis in this brief is zero-sum.**
It asks four things of one search budget, and strengthening one part takes from
another — the same finding that removed ZIPs ("the brief asked for five things
on a budget that covered three"). Adding matching emphasis to part (c) would
be expected to steal it straight back.

**The structurally correct fix is to SPLIT research into two passes** — one for
areas and subdivisions, one for conditions — the way research and structuring
are already split. Roughly half a day, and research cost per city roughly
doubles to ~$2.50. Not attempted; a second $1.45 coin flip was worse value
than doing it properly later.

Houston's committed research and pages are the pre-experiment ones. Nothing on
disk carries the failed change.

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

**Still untested against a real model: the ops block.** Houston predates it
and has no ops data. Every path into and out of it is now covered by the
suite, but nothing has yet watched a model receive a supplied fact and use
it. Testing that needs real facts for a real market — a crew lead's first
name, a homes-cleaned count, two reviews. Inventing them to exercise the
feature is the failure this project exists to prevent.

Entering them now takes ten minutes at `/admin/sites/houston`, and
regenerating is ~$0.80.

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

`content/_drafts/houston.json` — fully generated, all five stages.
`done: ['research','front','deep','suburb','service']`, 6 areas, 6 metro
conditions, 37 subdivisions, 32 sections, 16,284 chars of persisted findings.

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

## The question that picks the next task

**Is any market being generated actually operating yet?**

The ops block asks for a crew lead's first name, months served, homes cleaned,
real reviews. Ivy Cleans operates in Minneapolis — that is the live site.
Houston is a target market. If nobody is cleaning houses in Houston yet, there
is no crew lead there, and filling the block in would be inventing precisely
what this project refuses to invent.

- **A market IS operating** → get its real facts (ten minutes) and regenerate
  that city (~$0.80). That answers whether the model uses supplied facts
  naturally or bolts them on. Then build **D**, which enforces them.
- **No market is operating yet** → skip A's test and skip D. Both are
  machinery for facts that do not exist. Do **C — service local sections**
  instead (1 day, ~$0.50/city): six of the seven service pages are currently
  identical in every city, which is a real differentiation gap needing no
  input from the owner.

Do not build D before seeing the ops block work. It turns an unused supplied
fact into a failed page; building that enforcement for something never
observed risks a validator that fails everything and teaches nothing $0.80
would not have.

## What to do next, in order

1. **Minneapolis.** It is the ONLY live site, it has sixteen months of Search
   Console data, and it can receive none of this work: 8 sections, no area
   copy, no service copy, and `publishCity` deleted the sidecar it would need
   to regenerate from. **There is no path today to rebuild a live city.**
   That is the biggest remaining lever and it is not on Abdi's list.
2. **Miami** — 11 areas, zero subdivisions, so the gate refuses all of them.
   Needs research re-run (~$1.20) before it can produce anything.
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
