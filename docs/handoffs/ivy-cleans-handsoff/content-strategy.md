# Content strategy — the full change list

What has to be true of every page for it to rank, and which files make it true.

**Not more pages.** Twelve area pages and seven service pages per city is the right scope. Service-in-city pages (`/katy/deep-cleaning/`) stay deferred — at 100 sites that's 8,400 pages of a type you haven't proven yet. Depth per page beats page count.

---

## The five properties

| # | Every page must… | Otherwise | Delivered by |
|---|---|---|---|
| 1 | **Target a real query** | It ranks for nothing | Change 2 — DataForSEO keywords |
| 2 | **Be distinct from its siblings** | Google treats them as one page and ranks none | Changes 1, 3, 5 — research kept, area pages generated, similarity enforced |
| 3 | **Carry proof you're a real business there** | It reads like a farm; no trust, no E-E-A-T | **NEW — the ops block** |
| 4 | **Sound like a person, not a template** | Readers bounce; Google's quality signals notice | **NEW — voice rewrite** |
| 5 | **Be checked before it ships** | You find out at 100 sites what you could have caught at 1 | Change 5 + **NEW entity/ops validators + evals** |

Changes 1–7 in the handoff deliver properties 1, 2 and half of 5. That's the 3 → 7 move. What follows is the rest.

---

## A · The ops block — property 3

**This is the single most valuable addition, and it's the one only you can supply.** A competitor can generate a good description of Katy. They cannot generate the fact that Maria's crew has cleaned 340 homes in Cinco Ranch since March 2024. That's what separates a real multi-location business from a network of doorway pages, in both a reader's eyes and Google's.

### Schema — `src/pipeline/schemas.ts`

```ts
/**
 * Per-market operations facts. Entered by a human in the admin form, never
 * researched, never generated. Every field is optional because a new market
 * won't have most of them yet — but the prompts are required to use whatever
 * is present, and a page that ignores a supplied fact fails validation.
 */
export const MarketOpsSchema = z
  .object({
    /** "2024-03" — month you started serving this market. */
    servingSince: z.string().optional(),
    /** First name only. "Maria". Never a surname. */
    crewLead: z.string().optional(),
    crewSize: z.number().int().positive().optional(),
    /** Rounded down to a number you can defend. */
    homesCleaned: z.number().int().nonnegative().optional(),
    /** Real reviews from customers IN this market. Quote, first name, area. */
    reviews: z
      .array(
        z.object({
          quote: z.string(),
          firstName: z.string(),
          area: z.string(),          // "Cinco Ranch"
          date: z.string().optional(),
        }).strict()
      )
      .optional(),
    /** Paths to real photos of this crew / this market. Alt text generated. */
    photos: z.array(z.object({ path: z.string(), caption: z.string() }).strict()).optional(),
    /** Anything the owner wants known — "we're the only crew in Fulshear
     *  that does same-day". Data, not instructions (notesBlock rules apply). */
    notes: z.string().optional(),
  })
  .strict()
export type MarketOps = z.infer<typeof MarketOpsSchema>
```

### Where it lives — `src/pipeline/facts.ts`, `src/content/types.ts`

Add `ops?: MarketOps` to `Facts` and to `CityContent`. It enters through the admin form (`admin/new/page.tsx`, `sites/[key]/settings-form.tsx`) and is stored on the city document. It goes through `deriveFacts()` like the phone number does — a human typed it, it is fact, the model never touches it.

### How prompts use it — `src/pipeline/stages.ts`

Every content prompt gets an `opsBlock(facts)` alongside `notesBlock(facts)`:

```ts
function opsBlock(facts: Facts): string {
  const o = facts.ops
  if (!o) return ''
  const lines: string[] = []
  if (o.servingSince) lines.push(`Serving ${facts.city} since ${o.servingSince}.`)
  if (o.crewLead) lines.push(`Local crew lead: ${o.crewLead}. Use the first name once, naturally.`)
  if (o.homesCleaned) lines.push(`Homes cleaned in this market: ${o.homesCleaned}. Use the number, rounded.`)
  if (o.reviews?.length) {
    lines.push(`Real customer reviews from this market — quote at most two, verbatim, attributed by first name and area:`)
    for (const r of o.reviews) lines.push(`  "${r.quote}" — ${r.firstName}, ${r.area}`)
  }
  return `\nFACTS ABOUT THIS BRANCH — these are true and you must use every one that is supplied. Do not embellish them, round them up, or invent a companion fact to sit beside them.\n${lines.join('\n')}\n`
}
```

**The rule that makes it work:** if `ops.crewLead` is supplied, the page must contain it. If `ops.homesCleaned` is supplied, the number must appear. The validator (section D) enforces this. A page that received a real fact and didn't use it is a failed page.

### The hard limits change

`SYSTEM_BASE` currently forbids stating "number of years in business, staff count, employee names." Keep that as the default and carve out the ops block: *"…unless the fact is supplied in FACTS ABOUT THIS BRANCH, in which case it is true and you use it as given."* The prohibition was there to stop invention. Supplied facts aren't invented.

---

## B · Voice — property 4

### The problem

`SYSTEM_BASE` tells the model the target register is:

> *"we can assertively declare that our business ethos is unmatched"* and *"put our skills to an effective test"*

That's the live Minneapolis hero. It's stilted, it's from a page at position 33 that earns almost nothing non-brand, and the model reproduces it faithfully — Houston came out as "we can assertively declare that our standard of work is unmatched." The exemplar system is working; it's pointed at the wrong exemplar.

### Rewrite — `src/pipeline/stages.ts`, `SYSTEM_BASE`

Replace the VOICE section:

```
VOICE
- First person plural. "We", "our crew", "our team". Address the reader as
  "you" and "your home".
- Plain, specific, confident. The register of a good tradesperson explaining
  the job at your kitchen table — not a brochure, not an ad, not a mission
  statement. Short sentences are fine. Say the concrete thing.
- Prefer a fact to an adjective. "Tile grout in a 2,400 sq ft Cinco Ranch
  home takes our crew most of a morning" beats "we deliver exceptional
  results with meticulous attention to detail."
- Never open a paragraph with the city name and a comma. Never open a
  section with a rhetorical question. No exclamation marks.
- Contractions are fine. Typographic apostrophe (U+2019) throughout.
- American English.

BANNED — these are the tells that mark copy as generated. Using one fails the page.
  "nestled in the heart of"        "whether you're a busy professional"
  "we understand that every home"  "look no further"
  "in today's fast-paced world"    "hustle and bustle"
  "vibrant community"              "we've got you covered"
  "trusted partner"                "when it comes to"
  "at the end of the day"          "peace of mind" (max once per page)
  "meticulous"                     "exceptional" (max once per page)
  "assertively declare"            "put our skills to the test"
  "unmatched"                      "second to none"
```

### Structural examples — `buildFrontPrompt`

The five `MPLS_*` constants stay as *shape* references (paragraph count, length) but stop being *voice* references. Add one line to each example's introduction: *"This shows the length and structure only. Its voice is not the target — the VOICE section above is."*

For hero paragraphs 4 and 5 — the single-sentence CTAs — replace the example with a spec, since matching a one-sentence shape means copying it: *"One sentence inviting a call or a quote request. Vary the construction; do not reuse the example's wording."*

### Test it

Regenerate Houston. Read the hero. If it still says "assertively declare," the exemplar is overriding the voice section and the examples need to move *after* the VOICE block or be shortened. Iterate on one city until the register is right, then it's right everywhere.

---

## C · Service pages — property 2, second half

Six of seven service pages are static files rendered identically in every city. Airbnb cleaning in Houston and in Minneapolis are genuinely different pages — hurricane-season turnovers versus winter ones, 9,000 listings versus a few hundred — and right now they can't be.

**Don't regenerate the whole page.** The explanation of what a deep clean *is* should be the same everywhere; that's the canonical text and duplicating it per city would cannibalise. Generate only the **local section**.

### Add a `service` stage — `src/pipeline/stages.ts`

```ts
{ id: 'service', label: 'Writing the local section of each service page' }
```

Slots, one per service: `service.{slug}.local` — a 90–130 word paragraph answering *what changes about this service because of this city.* Fed the metro conditions from research and the ops block.

```ts
export function buildServiceLocalPrompt(facts: Facts, research: ResearchOutput, service: ServiceSlug): string {
  const conditions = research.conditions.filter((c) => c.copySafe)
  return `Write the "In ${facts.city}" section for the ${SERVICE_NAMES[service]} page.
${opsBlock(facts)}${notesBlock(facts)}
The page already explains what ${SERVICE_NAMES[service]} is, what's included, and how it's priced — that copy is fixed and shared. Do not repeat any of it.

Your section answers one question: what is different about ${SERVICE_NAMES[service]} in ${facts.city} specifically, because of the homes, the climate, or how people live here?

LOCAL CONDITIONS, with what each means for cleaning:
${conditions.map((c) => `- ${c.condition} — ${c.implication}`).join('\n')}

90 to 130 words. Lead with the most specific condition. If none of the conditions genuinely change how this service is done here, say so plainly in two sentences rather than padding — "a move-out clean in ${facts.city} is the same job as anywhere; what changes is…" is an honest and useful paragraph.`
}
```

### Render it — `src/data/services/*.ts`

Each of the six static builders gains one line: an `inCity` block rendered from `s(c, \`service.${slug}.local\`)`. The template around it doesn't change.

Seven calls per city, ~$0.50. This is the cheapest property-2 win left.

---

## D · Validators — property 5

`similarity.ts` (change 5) catches duplication. Three more checks, all mechanical, all in a new `src/content/quality.ts`, run at finalize:

```ts
export interface QualityFinding { slot: string; rule: string; detail: string }

export function checkQuality(doc: CityContent, research: ResearchOutput, facts: Facts): QualityFinding[] {
  const out: QualityFinding[] = []
  const text = (slot: string) => String(doc.sections[slot] ?? '')

  // 1 · Entity coverage — an area page must name its own subdivisions.
  for (const sub of research.suburbs) {
    const page = ['intro', 'homes', 'local'].map((k) => text(`suburb.${sub.slug}.${k}`)).join(' ').toLowerCase()
    const named = sub.subdivisions.filter((s) => page.includes(s.toLowerCase()))
    if (sub.subdivisions.length >= 3 && named.length < 3) {
      out.push({ slot: `suburb.${sub.slug}`, rule: 'entity-coverage',
        detail: `names ${named.length} of ${sub.subdivisions.length} subdivisions; needs 3` })
    }
  }

  // 2 · Ops facts used — a supplied fact that doesn't appear is a failure.
  const front = Object.entries(doc.sections).filter(([k]) => k.startsWith('services.')).map(([, v]) => String(v)).join(' ')
  if (facts.ops?.crewLead && !front.includes(facts.ops.crewLead))
    out.push({ slot: 'services.*', rule: 'ops-unused', detail: `crew lead "${facts.ops.crewLead}" not mentioned` })
  if (facts.ops?.homesCleaned && !front.includes(String(facts.ops.homesCleaned)))
    out.push({ slot: 'services.*', rule: 'ops-unused', detail: `homesCleaned ${facts.ops.homesCleaned} not mentioned` })

  // 3 · Banned phrasings — the list from SYSTEM_BASE, checked mechanically.
  for (const [slot, value] of Object.entries(doc.sections)) {
    const t = (Array.isArray(value) ? value.join(' ') : String(value)).toLowerCase()
    for (const phrase of BANNED) {
      if (t.includes(phrase)) out.push({ slot, rule: 'banned-phrase', detail: `"${phrase}"` })
    }
  }

  // 4 · Reading level — Flesch 60–80. One dependency (text-readability) or a
  //     20-line implementation; either is fine.

  return out
}
```

Surface findings in the review screen next to the similarity findings. Block publish on `entity-coverage` and `ops-unused`; warn on the rest.

**Why this matters more at 100 than at 1:** you will not read 1,200 area pages. The validators are how you know the strategy is being executed, not just specified.

---

## E · Evals — property 5, the part that keeps it a 10

Without evals, every prompt change is a gamble across 100 sites. With them, it's a measurement.

### `evals/` — five fixture cities

Five `research.json` + `facts.json` pairs, chosen for range: a Sun Belt master-planned suburb (Katy), a cold-climate older metro (Minneapolis), a coastal humid one (Miami), a small affluent town, and a deliberately thin one where the uniqueness gate should drop most areas.

### `evals/run.mjs`

Runs the full pipeline against each fixture with the real model, then scores:

| Check | Pass |
|---|---|
| Similarity across the five | no verbatim run ≥ 60 chars |
| Sibling similarity within each | all pairs < 0.75 |
| Entity coverage | every built area names ≥ 3 subdivisions |
| Ops facts used | every supplied fact appears |
| Banned phrases | zero |
| Flesch | 60–80 on every slot |
| Uniqueness gate | thin fixture drops ≥ half its areas |
| **Rubric** | a second model call scores each area page 1–5 on *"would a resident recognise their own neighbourhood?"* — flag anything under 4 |

Five cities × full pipeline is roughly $3 a run. Run it before merging any prompt change. Keep the scores in the repo so you can see the trend.

---

## F · What I'd leave alone

**The front page structure.** It's ten paragraphs about dusting, vacuuming, bathrooms, windows and upholstery — tasks, not services — and it's not a great page. But it's traced byte-for-byte to the live Elementor design, restructuring it is a design decision not a content one, and it's the page that already gets your clicks (brand). The area pages are the constraint. Fix those first; revisit the front page when you have data on what the new area pages do.

**Service-in-city pages.** Deferred, and the reasoning hasn't changed.

**FAQ generation.** The FAQ page is static. Generating it from PAA data is a real improvement but a small one — most cleaning FAQs are universal. Add it after C.

---

## G · The last 10% isn't building

Once A–E are in: **a feedback loop.** Monthly, per site, read Search Console. Find queries with impressions where the site has no matching content — "does ivy cleans do carpet in katy" showing up when there's no carpet section — and queue a content addition. That's how the strategy improves after launch instead of only before it.

And **conversion**, which isn't content but is where "produces results" is decided. At sixty visitors a month per site, click-to-call above the fold and a two-field form are worth as much as ten ranking positions. Separate workstream, same priority.

---

## Order

| Step | What | Effort | Property |
|---|---|---|---|
| 1 | Changes 1, 3, 5 from the handoff | 2–3 days | 2, 5 |
| 2 | **A — ops block** schema, form, prompts | 1 day | **3** |
| 3 | **B — voice rewrite**, iterate on one city | half day | **4** |
| 4 | Change 2 — real keywords | half day | 1 |
| 5 | **D — validators** | half day | 5 |
| 6 | **C — service local sections** | 1 day | 2 |
| 7 | **E — evals** | 1 day | 5 |
| 8 | Changes 4, 6, 7 | 1 day | hygiene |

About eight working days for the whole content strategy. Steps 1–3 are where the rating moves most; do them before generating a single production city.

---

## What you have to supply

None of this works without the ops block, and only you have it. Per market, ten minutes:

- Month you started serving it
- Crew lead's first name
- Roughly how many homes you've cleaned there
- Two or three real reviews from customers in that market, with first name and area
- One photo of the actual crew

That's it. Feed that in and the pages stop being descriptions of a town and start being a business that works there.
