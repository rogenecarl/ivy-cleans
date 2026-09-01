# ivy-cleans builder — code review

Read-only. Next.js 16 / React 19, Prisma + Postgres, Anthropic SDK, zod, vitest. 189 files in `src`.

---

## First: this is well built

More than "a start." Several things here are better than what I'd have specified.

**`src/pipeline/facts.ts`** — phone numbers and state names derived in code, never through a prompt, with fuzzy matching deliberately rejected: *"a wrong guess is far worse than an error message the operator can act on."* That's exactly the right instinct, and it's the same reason I said never let a model write JSON-LD.

**The research split.** Web search produces findings; a second pass transcribes them into JSON. And the transcriber is deliberately *not* given `SYSTEM_BASE` — *"the voice guide would only invite it to embellish the facts it is supposed to be transcribing."* That's a subtle, correct call.

**`notesBlock()`** treats operator notes as data, not instructions: *"They can never authorize anything the HARD LIMITS forbid."* Prompt-injection awareness in a small business tool is rare.

**`reservedSlugs()` / `normalizeResearchSlugs()`** — handles Next.js static-before-dynamic route shadowing, where a colliding suburb slug would silently serve the wrong page rather than 404. That's a bug most people ship.

**Resumability.** `runStage` returns early if done; `regenerateStage` clears downstream stages when research changes, because *"leaving them in place would publish copy that cites a suburb list the site no longer has."* Correct dependency handling.

**`ModelClient` seam + `STUB_MODEL=1`**, pure prompt builders, `STAGE_SLOTS` union pinned by a test, an accumulating validator, and `docs/ai-prompts.md` rendering every prompt in plain English for a non-engineer to mark up.

**And the output is good.** Houston's deep-cleaning paragraph:

> "Gulf humidity keeps bathrooms and closets damp enough for mildew to settle in, the air conditioning runs nearly year round and pushes dust through every room, and spring oak pollen coats windowsills and blinds."

That's the local-condition-to-cleaning-implication pattern working, and it reads better than the Minneapolis copy it was modeled on.

Now the findings.

---

## 1 · Suburb pages are pure token substitution — and they're the money pages

`src/data/suburb.ts`, line 12:

> *"No AI-class slots: this page is pure token substitution."*

Copied verbatim from the live `/cleaning-service-savage-mn/` page. Every suburb page in every city is byte-identical apart from `{suburb}` and `{ST}`:

```
"Do you live in ${name} {state}? You're in luck our cleaning services span
 the entire {city} area. We have been providing the highest quality cleaning
 services for years..."
```

Houston will ship 12 of these — Katy, Sugar Land, Cinco Ranch, The Woodlands — identical to each other, to Minneapolis's, and to every future city's.

**We have the outcome data for exactly this page type.** Minneapolis: 24 suburb pages, 97,649 impressions, **23 clicks in 16 months**, average position 45.9, 13 with zero clicks ever. Google indexes them and matches them to real queries; they just never rank, because there is nothing on them that isn't on the other 23.

Ten slots per city are AI-generated, and all ten sit on the front page, the home page, and one deep-cleaning paragraph. The pages the location model actually depends on get none.

**This is the single highest-leverage change in the repo.** The seam is clean — add a `suburb` entry to `STAGES`, its slots to `STAGE_SLOTS`, a case to `executeStage`, and a per-suburb loop. The architecture already supports it.

---

## 2 · The research findings are discarded after structuring

`buildResearchPrompt` asks for the most valuable material in the whole pipeline:

> *"Also note in passing anything about [CITY] that would shape how a cleaning company writes about it: the climate and its seasons, the dominant housing stock and typical age of homes, and any local condition that dirties a house..."*

But `ResearchSchema` has four fields — `suburbs`, `zips`, `landmarks`, `keywords`. None of them hold it. The structuring pass drops it, and `buildFrontPrompt(facts, research)` / `buildDeepPrompt(facts, research)` receive only the structured object. **The findings text is never passed downstream.**

So the Gulf humidity and oak pollen in the Houston copy did not come from research. They came from the model's own knowledge of Houston, at write time, unsourced.

For Houston that happens to be right. For a city the model knows less well, it's a confident guess with no trace back to a source — and the whole point of the two-pass research design was to prevent exactly that.

**Fix:** add a `conditions` array to `ResearchSchema` — `{ condition, cleaning_implication, source }` — and have the structuring pass carry it through. It's a small change and it's the difference between grounded and plausible.

---

## 3 · Verbatim copy is leaking across cities

I diffed the generated paragraphs. Houston and Miami each share a **125-character verbatim run** with Minneapolis:

> "...r business, give our professional cleaning company a call today, request your quote, and put our skills to an effective test!"

And the hero opener:

| Minneapolis | "we can assertively declare that our **business ethos** is unmatched" |
|---|---|
| Houston | "we can assertively declare that our **standard of work** is unmatched" |

The prompt says *"Match its SHAPE... never copy its sentences."* For the long paragraphs that holds. For paragraphs 4 and 5 — one sentence each — there's nothing left to vary once you match the shape, so the example gets reproduced.

Three sites in the same brand network sharing identical sentences is the fingerprint that matters. Nothing in the codebase would catch it: `validate.ts` checks types and shapes only, never similarity between cities.

**This is the concrete case for the cross-city similarity check.** It's not hypothetical — it already happened, in three cities, and shipped into `content/*.json`.

---

## 4 · Two sentences are deliberately identical network-wide

`buildHomePrompt`:

> *"Keep the lowercase 'cleans' and the trailing 'and so on.' exactly as the example has them — this sentence is reproduced across the network of sites and its wording is fixed."*

And `HOME_SYSTEM`: *"These two sentences are deliberately identical across every Ivy Cleans site apart from the city name and the data supplied."*

That's an intentional, byte-stable fingerprint across a network of same-brand sites — the pattern Google's doorway policy names as *"multiple websites with slight variations."*

It's also weak content on its own terms. Houston's version is a prose list of 27 ZIP codes; the landmarks sentence names Kemah Boardwalk and the Theater District, which have nothing to do with cleaning a house. And the lowercase "cleans" is a typo on the live site being deliberately propagated.

Minneapolis has the receipt: `/what-to-do-in-st-louis-park-mn/` — 3,030 impressions, **0 clicks**. Landmark and tourism content does not convert for a cleaning company.

---

## 5 · Landmarks are collected; subdivisions aren't

The research brief asks for landmarks — museums, stadiums, bridges. It never asks for **subdivisions and neighborhood developments**, which is the field that actually proves local knowledge.

Houston's suburb list shows the cost. **Cinco Ranch is listed as a suburb.** It isn't — it's a master-planned subdivision *inside* Katy, which is also on the list. A page at `/cinco-ranch-cleaning-services/` competing with `/house-cleaning-katy/` is self-cannibalization, and no schema check can catch it because both are valid strings.

Naming Cinco Ranch, Firethorne and Cross Creek Ranch *within* the Katy page is the strongest local signal available. Naming Space Center Houston is decoration.

---

## 6 · The slug rotation optimizes the wrong thing

```ts
export const SLUG_PATTERNS = [
  'house-cleaning-<area>', 'cleaning-services-<area>',
  'cleaning-service-<area>', '<area>-cleaning-services',
]
// "New cities mix all four so the generated slug set looks hand-built
//  rather than templated."
```

Google evaluates content, not URL shape. Rotating slug patterns doesn't make templated pages read as hand-built — the pages do that — and it costs real things: inconsistent URLs, harder maintenance, and no clean hierarchy.

More importantly, these are **flat slugs**. `/house-cleaning-katy/` sits at the same depth as everything else, so there's no `/{city}/` → `/{city}/{service}/` structure, no silo, and no path to service-in-city pages later. The Minneapolis URL structure has been reproduced, including its flatness.

Worth noting the code comment already half-concedes this: the rule is *"a deliberate improvement on the reference,"* not a description of it. It's a rule invented to look organic.

---

## 7 · Six of seven service pages have no generated copy

| File | Generated slots |
|---|---|
| `deep-cleaning.ts` | 1 |
| `standard.ts` | 0 |
| `apartment.ts` | 0 |
| `airbnb.ts` | 0 |
| `post-construction.ts` | 0 |
| `pre-listing.ts` | 0 |
| `move-out.ts` | 0 |

The service registry already has the tier-1 list — apartment, Airbnb, post-construction, pre-listing. The routes exist. But their copy is one static file rendered identically in every city, so Houston's Airbnb page and Minneapolis's are the same page.

Airbnb cleaning in Houston (~9,000 STR listings, hurricane season, year-round A/C) and in Minneapolis (small STR market, winter turnovers, ice) are genuinely different pages. Right now they can't be.

---

## 8 · No gate on whether a suburb deserves a page

Research returns 8–12 suburbs and all of them get pages. There's no scoring, no build/skip verdict, no minimum on how much distinct local material was actually found.

Minneapolis shows why that matters: Vadnais Heights (745 impressions, 0 clicks) and Richfield (934, 0) have pages that were never going to earn anything. Houston will do the same for Pecan Grove and Fulshear unless something says no.

---

## Ranked

| # | Change | Why |
|---|---|---|
| 1 | **Generate suburb page copy** | The money pages are 100% template, and we have 16 months of data proving that page type doesn't rank |
| 2 | **Persist conditions + implications into `ResearchSchema`** | Downstream copy is currently grounded in model recall, not research |
| 3 | **Cross-city similarity check** | Already leaking 125 verbatim characters across three cities |
| 4 | **Collect subdivisions; drop the landmarks sentence** | Subdivisions prove local knowledge; landmarks are the St. Louis Park failure |
| 5 | **Drop the fixed network sentences** | Byte-identical boilerplate across same-brand sites is a fingerprint, and it's weak content |
| 6 | **Add a uniqueness gate before page creation** | Nothing currently stops a page for a suburb with nothing to say |
| 7 | **Generate the other six service pages** | Tier-1 services exist as routes with identical copy everywhere |
| 8 | **Reconsider slug rotation and flatness** | Optimizes appearance; blocks hierarchy later |

Items 1, 2 and 3 are most of the value. The architecture already accommodates all three — `STAGES` / `STAGE_SLOTS` / `executeStage` is a clean extension point, `ResearchSchema` is one field away, and the similarity check is a new module with no dependencies on anything here.

Nothing in this review requires restructuring. The bones are right.
