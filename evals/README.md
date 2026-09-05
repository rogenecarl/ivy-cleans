# evals — measuring a prompt change instead of guessing at it

Content-strategy item E. Run this before merging any change to a prompt.

```bash
npx tsx evals/run.mjs                 # every fixture
npx tsx evals/run.mjs houston-tx      # one
npx tsx evals/run.mjs --dry-run       # plan and cost, no spend
npx tsx evals/run.mjs --no-rubric     # mechanical checks only, ~40% cheaper
```

Exits non-zero when a check fails, so it can gate a merge.

---

## Why this exists

Every prompt change is a bet placed across every city that will ever be
generated. Twice now a change has been judged by reading one city's output by
hand — which caught real defects both times, and cost an afternoon each time.

The second of those is the reason the rubric check exists. The service-page
convergence — four of six pages working through the same four facts in the
same order — passed **every mechanical check**: entity coverage fine, no
banned phrases, similarity 0.054 against a 0.75 threshold. Only reading them
found it. A second model asked "would a resident recognise their own
neighbourhood?" is the automated form of that reading.

---

## Frozen research — the one deliberate departure from the spec

`content-strategy.md` describes running "the full pipeline against each
fixture". This runs everything **except** research, from research frozen into
the fixtures.

Three reasons:

1. **Cost.** Research is ~106K input tokens — about $1.06 of the $1.35 a city
   costs, because web search pulls page content into context. Full-pipeline
   evals are ~$7 a run; these are ~$1.50. An eval nobody runs because it is
   expensive has no value.
2. **Determinism.** Live web search returns different results week to week. A
   suite whose inputs move cannot tell you whether your prompt got better or
   the search did.
3. **It is not what changes.** Prompt work lands in `front`, `deep`, `suburb`
   and `service`. The research brief changes rarely, and when it does, the
   right move is to re-freeze the fixtures deliberately (below) rather than
   have every run silently measure something new.

**Re-freezing after a research change:** regenerate a city for real
(`npx tsx scripts/generate-city.mjs houston --stage research --regenerate`),
then copy its draft's `research` into the fixture.

---

## The fixtures

All research here is **real** — produced by the actual research stage against
the actual web. Nothing about a place is invented.

| Fixture | What it is for |
|---|---|
| `houston-tx` | The rich case. 6 areas, 37 subdivisions, 6 metro conditions. Every check should pass. |
| `miami-fl` | The thin case. 11 areas, **zero** subdivisions on all of them. The uniqueness gate should drop every one, and the run should produce no area pages rather than inventing developments. |
| `houston-ops` | Houston's research plus an ops block, to test the one thing no real run has tested: does a supplied operator fact actually reach the copy. |

### On `houston-ops`

`facts.ops` there is **fixture data and must never be published.** The crew
lead's name and the homes-cleaned count are invented — deliberately, because
inventing operator facts about a market that really operates is the failure
this whole project exists to prevent, and no market being generated is
operating yet.

That leaves exactly one honest way to test the ops block against a real model:
a fixture that is obviously a fixture, in a directory that never reaches a
published document. The pipeline cannot publish from here — `run.mjs` writes
under `zeval-` keys and deletes them.

---

## What is checked

| Check | Passes when | Blocking |
|---|---|---|
| Uniqueness gate | the thin fixture builds no area pages | yes |
| Entity coverage | every built area names its own subdivisions (`quality.ts`) | yes |
| Ops facts used | a supplied crew lead / count reaches the copy | yes |
| Banned phrases | zero, across every slot | yes here (a warning at publish, but in an eval it means the prompt regressed) |
| Sibling similarity | every within-city pair under 0.75 | yes |
| Cross-fixture verbatim | no shared run of 60+ characters between fixtures | yes |
| **Rubric** | a second model scores each area page 1–5 on "would a resident recognise their own neighbourhood?" — nothing under 4 | yes |

Not checked: **reading level**. `content-strategy.md` lists Flesch 60–80 as
optional. A syllable counter accurate enough to act on is more than it looks,
and an inaccurate one produces warnings people learn to ignore — the same
reasoning that kept it out of `quality.ts`.

---

## Results

Every run writes `evals/results/<ISO timestamp>.json` and they are committed.
The point is the trend: a prompt change that improves one number and quietly
costs you two others is visible only against the previous run.
