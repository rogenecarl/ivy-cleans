# Changes 4 and 6 — wiring the gate, retiring the landmarks sentence

Both touch overlapping files, so they're one patch. Change 4's scoring functions are already in `stages-patch.ts`; this is the wiring.

---

## A bug you'd hit immediately

`updateSuburbsLogic()` currently does this:

```ts
draft.research = { ...draft.research, suburbs }   // suburbs: {name, slug}[]
```

Under the old four-field schema that was fine — a `Suburb` *was* `{name, slug}`. Under the new one it silently wipes `subdivisions`, `housingCharacter` and `conditions` for every row, every time an operator touches the editor. The area pages would then regenerate from nothing, and the uniqueness score would drop to zero across the board.

**Fix — merge by slug rather than replace:**

```ts
/**
 * Rows from the editor carry name and slug only; the researched fields live
 * on the existing entries and must survive an edit. Slug is the stable
 * identity, so match on it and copy the research across.
 *
 * A row whose slug matches nothing is one the operator ADDED by hand. It gets
 * empty research fields, which is honest — nobody researched it — and the
 * uniqueness gate will score it 0 and flag it in the review screen rather
 * than letting an unresearched area quietly become a page.
 */
function mergeSuburbRows(
  rows: Array<{ name: string; slug: string }>,
  existing: readonly Suburb[]
): Suburb[] {
  const bySlug = new Map(existing.map((s) => [s.slug, s]))
  return rows.map((row) => {
    const prior = bySlug.get(row.slug)
    return {
      name: row.name,
      slug: row.slug,
      subdivisions: prior?.subdivisions ?? [],
      housingCharacter: prior?.housingCharacter ?? '',
      conditions: prior?.conditions ?? [],
    }
  })
}
```

Then in `updateSuburbsLogic`, replace both assignments:

```ts
if (draft?.research) {
  draft.research = {
    ...draft.research,
    suburbs: mergeSuburbRows(rows, draft.research.suburbs),
  }
  await saveDraft(key, draft)
  touched = true
}

if (doc) {
  doc.research = {
    ...doc.research,
    suburbs: mergeSuburbRows(rows, doc.research.suburbs),
  }
  // ... unchanged
}
```

One consequence worth deciding on: **renaming an area keeps its old research.** If an operator changes "Katy" to "Cypress" without changing the slug, the Cypress page inherits Katy's subdivisions. Slug is identity here, so that's consistent behaviour — but it's worth a line in the editor hint, or a rule that changing the name clears `subdivisions`. I'd leave it and document it; operators rename for spelling far more often than they repoint a row at a different place.

---

## Change 4 · Wiring the uniqueness gate

### Where it runs

In `executeStage`'s `research` case, right after `normalizeResearchSlugs`:

```ts
const normalized = normalizeResearchSlugs(structured, facts.city)
const { research: gated, scored } = applyUniquenessGate(normalized)
draft.research = gated

const skipped = scored.filter((s) => s.verdict === 'skip')
const flagged = scored.filter((s) => s.verdict === 'review')

await appendProgress(key, {
  stage: 'research',
  kind: 'found',
  label:
    `${gated.suburbs.length} areas kept` +
    (flagged.length ? ` · ${flagged.length} thin` : '') +
    (skipped.length ? ` · ${skipped.length} dropped: ${skipped.map((s) => s.suburb.name).join(', ')}` : ''),
})
```

Naming the dropped areas in the progress line matters. A silent drop looks like the research simply found less, and the operator has no way to tell the difference between "there was nothing there" and "something went wrong."

### Don't persist the score

`scoreSuburbs()` is a pure function of `research`, so recompute it wherever it's needed rather than storing it on `DraftDoc`. No schema change, and it can never drift out of sync with an edited suburb list.

### Surfacing it in the review screen

`suburbs-editor.tsx` takes `initial: Row[]` where `Row = {name, slug}`. Widen it:

```ts
type Row = { name: string; slug: string }
type RowMeta = { score: number; verdict: 'build' | 'review' | 'skip'; reason: string }

export default function SuburbsEditor({
  cityKey,
  initial,
  meta,          // keyed by slug — absent for operator-added rows
}: {
  cityKey: string
  initial: Row[]
  meta: Record<string, RowMeta>
})
```

In the review page (`review/[key]/page.tsx`), build `meta` from the draft:

```ts
const scored = draft.research ? scoreSuburbs(draft.research) : []
const meta = Object.fromEntries(
  scored.map((s) => [s.suburb.slug, { score: s.score, verdict: s.verdict, reason: s.reason }])
)
```

Render a chip per row, using the existing `status-chips.tsx` pattern rather than a new component. Three states plus one:

| Verdict | Chip | Meaning |
|---|---|---|
| `build` | neutral/green | Enough distinct local material |
| `review` | amber | Thin — keep only if search demand justifies it |
| *(absent from meta)* | grey, "not researched" | Operator added this row by hand |

`skip` rows never reach the editor — they're dropped in the research stage. That's deliberate: the operator can still add one back manually, which is the right amount of friction for overriding the gate.

**A note on the e2e test.** `scripts/admin-e2e.mjs` asserts input counts by `SUBURBS.length`. Chips are not inputs, so that assertion holds — but if you add a per-row "restore dropped area" control, it will break. Worth checking before, not after.

---

## Change 6 · Retire the landmarks sentence, demote the ZIPs

`HOME_SYSTEM` states these two sentences are *"deliberately identical across every Ivy Cleans site apart from the city name."* The duplication scan confirms it — the ZIP sentence opener shows up as a verbatim match in every pairing of every city, including Testville.

That's a byte-stable fingerprint across a same-brand network. And on its own merits, a sentence containing twenty-seven ZIP codes isn't a sentence, while the landmark sentence names Kemah Boardwalk on a page about cleaning houses. The live Minneapolis landmark page ran 3,030 impressions and zero clicks across sixteen months.

### Full file list

| File | Change |
|---|---|
| `src/pipeline/schemas.ts` | Remove `HomeProseSchema` · **done in patch** |
| `src/pipeline/stages.ts` | Remove `HOME_SYSTEM`, `buildHomePrompt`, `MPLS_ZIP_SENTENCE`, `MPLS_LANDMARK_SENTENCE`, the `home` case, and `MODEL_KEYS.home` · **done in patch** |
| `src/pipeline/model.ts:38` | Standing research instruction still says *"never invent suburbs, zip codes, or landmarks"* → *"suburbs, subdivisions, or zip codes"* |
| `src/content/types.ts` | `research.landmarks` out; `conditions` in; suburbs gain three fields |
| `src/content/validate.ts` | Mirror it. Keep accumulate-then-throw |
| `src/data/home.ts:15-16, 74-77` | Drop `zipParagraph` / `landmarksParagraph`; pass `zips: c.research.zips` |
| `src/components/home/Locations.tsx` | Replace the final section (below) |
| `src/app/(sites)/[city]/(inner)/home/page.tsx:41-42, 72-73` | Swap the two props for `zips` |
| `src/pipeline/admin-logic.ts:152, 164` | Research summary type: drop `landmarks`, add `subdivisions` count |
| `src/app/admin-.../generate/[key]/stage-runner.tsx:263` | `{research.landmarks.length} landmarks` → subdivisions total |
| `src/app/admin-.../skills-meta.ts:15, 25` | Retire the "Locations" skill card; update the research tagline |
| `content/*.json` | Existing docs carry `home.*` slots and `research.landmarks`. Either migrate or let `validate.ts` reject them — see below |

### The Locations component

Replace the last `<section>` — the one carrying `2dabc70` — with a compact list. Same wrapper, same `max-w-[112rem]`, no model call:

```tsx
{zips.length > 0 && (
  <section className="bg-white">
    <div className="ec flex flex-col">
      <div className="max-w-[112rem]">
        <p className={`mb-[2rem] lg:mb-[3rem] ${bodyClass}`}>
          <span className="font-normal">ZIP codes we serve: </span>
          <span className="tabular-nums">{zips.join(", ")}</span>
        </p>
      </div>
    </div>
  </section>
)}
```

Props change from `zipParagraph: string; landmarksParagraph: string` to `zips: string[]`.

Note this drops one of the four live sections. Their comment explains the four-section split preserves the 10+10px Elementor widget gutters — with three sections you lose one seam's worth of spacing, so check the rendered gap against the reference rather than assuming.

### Existing city documents

`content/minneapolis.json`, `houston.json`, `miami.json` all carry `research.landmarks` and the two `home.*` slots. Once `validate.ts` changes, they fail.

**Minneapolis is live and needs a real migration:**

```
research.landmarks        → delete
sections.home.*           → delete
research.suburbs[].subdivisions      → []   (backfill later, or re-run research)
research.suburbs[].housingCharacter  → ''
research.suburbs[].conditions        → []
research.conditions                  → []
```

Empty research fields mean every Minneapolis area scores 0 on the uniqueness gate. That's *correct* — those pages have no researched local material, which is exactly why they earned 23 clicks in 16 months. Re-run research for Minneapolis when you're ready to rewrite them; until then the score honestly reflects what's there.

`houston.json` and `miami.json` are `status: draft` and unpublished. Delete and regenerate rather than migrating. `minnesota.json` looks like a mistake — a state where a city should be. `testville.json` is a fixture; update it to the new shape or the stub tests fail.

---

## Order

1. `mergeSuburbRows` in `admin-logic.ts` — this one is a live bug once the schema lands
2. Gate wiring in `executeStage` + the progress line
3. Chips in the review screen
4. Change 6's file sweep
5. Migrate `minneapolis.json`, delete the two drafts, update `testville.json`
6. `pnpm test` — the `STAGE_SLOTS` union pin and the stub fixtures both need updating for the new stage set

Then generate one city end to end and run `node scripts/check-duplication.mjs`. The ZIP-sentence findings should be gone entirely; what's left will be the hero paragraphs, which is the real signal.
