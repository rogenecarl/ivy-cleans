# What changes in the builder

Reconciling what we designed against what `ivy-cleans` already does. The architecture stays — this is a change list, not a rewrite.

---

## First, a revision to my own plan

I specced a 78-page Houston build: 3 city-multiplied services × 5 suburbs, plus pillars. Having seen the repo, that's wrong.

The repo currently generates **10 slots per city**, all on the front page, the home page, and one deep-cleaning paragraph. Suburb pages — the money pages — are pure token substitution. Minneapolis proved where that leads: 24 of them, 97,649 impressions, **23 clicks in 16 months**.

Adding service-in-city pages on top would multiply a page type that can't yet differentiate. 12 suburbs × 7 services = 84 more templated pages.

**So: fewer, better pages first.** Twelve genuinely differentiated suburb pages beat eighty-four templated ones. Prove differentiation at 12, then expand. Service-in-city pages are deferred, not cancelled.

---

## Page-type mapping

| Our design | Repo today | Status |
|---|---|---|
| Metro homepage | `front` stage — hero, serviceIntro, 5 cards | **Exists, works** |
| Service pillar | `deep` stage — 1 slot; 6 other services have 0 | **Mostly missing** |
| City page | Suburb pages — 0 generated slots | **Missing entirely** |
| Service-in-city | Doesn't exist | **Defer** |

---

## Change 1 · `ResearchSchema` carries conditions and subdivisions

**Why first:** everything else depends on it. Right now the research brief asks for climate, housing stock and local conditions — and the structuring pass drops all of it, because the schema has nowhere to put it. Downstream copy is grounded in model recall, not research.

**Files:** `src/pipeline/schemas.ts`, `stages.ts` (`buildResearchStructuringPrompt`), `src/content/types.ts`, `src/content/validate.ts`

```ts
export const ConditionSchema = z.object({
  condition: z.string(),     // "Gulf humidity averaging 75% year-round"
  implication: z.string(),   // "Bathroom mildew and grout discolouration"
  copySafe: z.boolean(),     // false = targeting only, never printed
}).strict()

export const ResearchSchema = z.object({
  suburbs: z.array(z.object({
    name: z.string(),
    slug: z.string(),
    subdivisions: z.array(z.string()),      // NEW — the strongest local signal
    housingCharacter: z.string(),           // NEW — build era, size, flooring, HOA
    conditions: z.array(ConditionSchema),   // NEW — suburb-specific
  }).strict()),
  conditions: z.array(ConditionSchema),     // NEW — metro-level
  zips: z.array(z.string()),
  keywords: z.array(z.string()),
  // landmarks: REMOVED — see Change 6
}).strict()
```

`copySafe` matters more than it looks. Katy sits near the Barker Reservoir flood pool — useful for planning, grotesque in cleaning copy. Same for income and crime data. The flag lets research collect it and the prompt refuse to print it.

**Not adding for v1:** `source_url` and `stability` per fact. The transcriber prompt already enforces "every item must appear in the findings," which covers most of the risk. Add them when you want an audit trail.

---

## Change 2 · Keywords come from DataForSEO, not from the model

The research brief currently asks the model to report *"the search phrases people in this area actually type."* A model plus web search cannot know that — it's producing plausible phrases, and every downstream prompt is steered by them.

You have a DataForSEO account. Real volumes, and the whole matrix for a city costs well under a dollar.

**Change:** drop part (d) from `buildResearchPrompt`. Populate `keywords` from a provider call — seed with `{service} {city}` combinations, sort by volume, keep the top 15–20 with their volumes attached so the prompts can weight them.

Cheapest v1: run it outside the pipeline, paste into the admin form. Wire it properly once the shape settles.

---

## Change 3 · Add the suburb stage

**The big one.** Suburb pages are the location model, and they currently have no generated content.

**Files:** `src/pipeline/stages.ts`, `schemas.ts`, `src/data/suburb.ts`

```ts
// STAGES
{ id: 'suburb', label: 'Writing the area pages' }

// STAGE_SLOTS — per suburb, keyed by slug
suburb: ['suburb.<slug>.intro', 'suburb.<slug>.local', 'suburb.<slug>.homes']
```

`STAGE_SLOTS` is currently a static list and its union is pinned against `REQUIRED_SLOTS` by a test. Suburb slots are dynamic — the shape depends on the research. Either make `STAGE_SLOTS.suburb` a function of the draft, or key suburb slots under a separate namespace the pin ignores. Worth deciding before writing the loop.

**`src/data/suburb.ts` keeps its skeleton** — hero, houseCleaning, benefits, otherServices, workInAction, closing — but three blocks become slots instead of token substitution:

| Block | Now | Becomes |
|---|---|---|
| `hero.paragraphs` | Template + `{suburb}` | Generated: coverage + one specific local fact |
| `houseCleaning.paragraph` | Template + `{suburb}` | Generated: named subdivisions, what homes here are like |
| `benefits.paragraphs` | Template | Generated: local conditions → what we do about them |

The rest — CTA labels, the image grid, other-services links — stays template. That's correct; not everything needs generating.

**The prompt inherits the ownership rule from `stage-c-prompts.md`:** the suburb page owns the suburb, and must not explain what any service involves. If it starts writing "a deep clean includes," it's on the wrong page.

**Hard requirements in the prompt:**
- Minimum 3 named subdivisions from `research.suburbs[i].subdivisions`
- Minimum 4 distinct local details, `copySafe: true` only
- Return an error if `subdivisions` is empty rather than writing around it

---

## Change 4 · Uniqueness gate before pages are created

Research returns 8–12 suburbs and every one gets a page. Nothing asks whether there's enough to say.

**Where:** alongside `normalizeResearchSlugs()` in `stages.ts`, which already drops colliding and reserved slugs. Same seam, same pattern.

```
score = subdivisions.length + conditions.filter(copySafe).length
        + (housingCharacter ? 2 : 0)

score >= 8  → build
score 4–7   → flag for operator review in the admin screen
score < 4   → drop, with the reason recorded
```

Vadnais Heights (745 impressions, 0 clicks) and Richfield (934, 0) would not have been built. Houston's Pecan Grove and Fulshear probably shouldn't be.

The admin review screen already has a `suburbs-editor.tsx` — surface the score and the reason there, so the operator overrides deliberately rather than by default.

---

## Change 5 · Cross-city similarity check

Not hypothetical. Houston and Miami each already share a **125-character verbatim run** with Minneapolis, and the hero went from "our business ethos is unmatched" to "our standard of work is unmatched." `validate.ts` checks types and shapes only — nothing compares cities.

**New module**, run at finalize/publish:

| Check | Threshold |
|---|---|
| Any generated paragraph vs the same slot in every other published city | shingle similarity > 0.80 → fail |
| Suburb page vs sibling suburb in the same city | > 0.75 → fail |
| Any verbatim run ≥ 60 characters shared with another city | fail |
| Banned phrasings (list in `stage-c-prompts.md`) | fail |
| Required entity counts per page type | fail |

The verbatim-run check is the cheapest and would have caught what's already shipped. Start there.

**On the structural examples:** paragraphs 4 and 5 of the hero are single sentences, so "match the shape, don't copy the sentences" is impossible to satisfy. Either give those two a spec instead of an example, or accept them as fixed brand lines and exclude them from the check deliberately. Right now it's neither.

---

## Change 6 · Retire the landmarks sentence; demote the ZIP sentence

`HOME_SYSTEM` states these two sentences are *"deliberately identical across every Ivy Cleans site."* That's a byte-stable fingerprint across a same-brand network, and it's weak content on its own terms.

- **Landmarks:** remove from research and from the page. Minneapolis's `/what-to-do-in-st-louis-park-mn/` scored 3,030 impressions and **zero clicks**. Kemah Boardwalk has nothing to do with cleaning a house. Subdivisions replace them and do the job better.
- **ZIP codes:** keep the data, drop the prose. Render as a compact list or a footer block. A sentence containing 27 ZIP codes isn't a sentence.

This also removes the `home` stage entirely — both its slots are these two sentences. Four stages become four again with `suburb` taking its place.

---

## Change 7 · One slug pattern, and leave room for hierarchy

`SLUG_PATTERNS` rotates four shapes so the set *"looks hand-built rather than templated."* Google reads content, not URL shape. Rotating costs consistency and buys nothing.

**For new cities:** use `/{suburb-slug}/` — just `/katy/`. Clean, consistent, and it leaves `/katy/deep-cleaning/` available when service-in-city pages arrive. Changing this on an unlaunched city is free; changing it later on a live one costs redirects.

**Minneapolis keeps its existing slugs.** Those URLs are indexed and the repo already handles them properly through stored slugs and the two 308s.

---

## What doesn't change

The bones are right and shouldn't be touched:

- `facts.ts` — deterministic derivation, no model in the path
- The two-pass research split, and keeping the transcriber off `SYSTEM_BASE`
- `notesBlock()` treating operator notes as data
- `reservedSlugs()` / `normalizeResearchSlugs()` — extend, don't replace
- Resumability, `regenerateStage`, downstream clearing
- The `ModelClient` seam and `STUB_MODEL=1`
- Draft → review → publish with per-stage regenerate
- `docs/ai-prompts.md` — keep it current; it's how a non-engineer stays in the loop

---

## Deferred

| Item | Why not now |
|---|---|
| Service-in-city pages | Multiplies a page type that can't differentiate yet. Revisit after 12 suburb pages prove out. |
| Generating the other 6 service pages | Real, but suburb pages are the constraint. Next after Change 3. |
| Full fact objects with `source_url` | Transcriber prompt covers most of the risk |
| URL hierarchy on Minneapolis | Indexed URLs, real redirect cost, no current benefit |

---

## Where the new tooling attaches

**Outside the builder — a market gate before the admin "new site" form.** The four gates in `market-qualification.md` run before a city is ever typed into the form. Census data for income and population trend is manual; everything competitive is measured in **OpenSEO** (see `openseo-setup.md`). This is the highest-leverage thing on the whole list and it needs no code in this repo.

**OpenSEO** — self-hosted, MCP-driven. Market qualification, map-pack analysis, rank tracking, backlinks, Search Console. Not part of the pipeline: it has no public REST API, only MCP and a web UI.

**DataForSEO** — Change 2 (called directly from the pipeline via `keywords.ts`), and the data source underneath OpenSEO. One account, two consumers.

**Ahrefs** — dropped. OpenSEO's `get_backlinks_overview` / `get_domain_overview` cover the domain-authority comparison that settles domain-per-metro versus subfolder.

---

## Order

1. **Change 1** — schema. Unblocks everything.
2. **Change 5, verbatim-run check only** — one afternoon, catches what's already shipping.
3. **Change 3** — the suburb stage. The main event.
4. **Change 4** — uniqueness gate. Cheap once the schema carries the data.
5. **Change 6** — drop landmarks, demote ZIPs.
6. **Change 2** — real keyword data.
7. **Change 7** — slugs, for the next new city only.

Then regenerate Houston end-to-end and diff it against Minneapolis. If the suburb pages read as genuinely different places, the model works and Houston is worth launching.
