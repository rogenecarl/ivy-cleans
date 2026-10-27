/**
 * PATCH for src/pipeline/stages.ts
 *
 * Blocks below are drop-in replacements or additions. Everything not shown —
 * SYSTEM_BASE, FRONT_SYSTEM, DEEP_SYSTEM, buildFrontPrompt, buildDeepPrompt,
 * normalizeSlug, reservedSlugs, runStage, regenerateStage — stays as it is.
 *
 * Summary of the change: the `home` stage is retired and a `suburb` stage
 * takes its place; research gains conditions and subdivisions; a uniqueness
 * gate drops areas with too little to say before they ever become pages.
 */

import type { Facts } from './facts'
import {
  DeepSchema,
  FrontSectionsSchema,
  ResearchSchema,
  SuburbCopySchema,
  type Condition,
  type ResearchOutput,
  type Suburb,
} from './schemas'

/* ═══════════════════════════════════════════════════════════════════════════
 * 1 · REPLACE the STAGES const
 * ═══════════════════════════════════════════════════════════════════════════ */

export const STAGES = [
  { id: 'research', label: 'Researching the city — areas, subdivisions, local conditions' },
  { id: 'front', label: 'Writing the front page — hero and services' },
  { id: 'deep', label: 'Writing the deep-cleaning page' },
  { id: 'suburb', label: 'Writing the area pages' },
] as const

export type StageId = (typeof STAGES)[number]['id']
export const STAGE_IDS: readonly StageId[] = STAGES.map((s) => s.id)

/* ═══════════════════════════════════════════════════════════════════════════
 * 2 · REPLACE STAGE_SLOTS — it can no longer be a static map
 *
 * The suburb stage writes three slots PER AREA, and how many areas there are
 * is not known until research completes. STAGE_SLOTS therefore becomes a
 * function of the draft's research rather than a const.
 *
 * The existing test that pins `union(STAGE_SLOTS) === REQUIRED_SLOTS` needs
 * the same treatment: pin `union(stageSlots(research)) === requiredSlots(
 * research)` for a fixture research object. The invariant it protects is
 * unchanged and still worth protecting — a slot no stage owns can never be
 * regenerated, and a slot no stage writes blocks finalizeDraft forever.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** The three slot ids one area page owns. Single source of truth for the
 *  loop, the regenerate path, and finalizeDraft. */
export function suburbSlots(slug: string): readonly string[] {
  return [`suburb.${slug}.intro`, `suburb.${slug}.homes`, `suburb.${slug}.local`]
}

export function stageSlots(research: ResearchOutput | undefined): Record<StageId, readonly string[]> {
  return {
    research: [],
    front: [
      'services.heroParagraphs',
      'services.serviceIntro',
      'services.cards.dusting',
      'services.cards.vacuuming',
      'services.cards.bathroom',
      'services.cards.window',
      'services.cards.upholstery',
    ],
    deep: ['deep.whatIs'],
    suburb: research ? research.suburbs.flatMap((s) => suburbSlots(s.slug)) : [],
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 3 · REPLACE SLUG_PATTERNS
 *
 * Was four patterns rotated so the slug set "looks hand-built rather than
 * templated". Google evaluates the page, not the shape of its URL, so the
 * rotation bought nothing and cost consistency.
 *
 * One pattern now, and a bare one: /katy/ rather than /house-cleaning-katy/.
 * That leaves /katy/deep-cleaning/ available for service-in-city pages later
 * without a migration. Changing this costs nothing on a city that has not
 * launched; on Minneapolis it would cost redirects, so Minneapolis keeps its
 * stored slugs — which the [serviceSlug] route already handles, since suburb
 * slugs are looked up by exact match and never derived.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const SLUG_PATTERN = '<area>' as const

/* ═══════════════════════════════════════════════════════════════════════════
 * 4 · REPLACE buildResearchPrompt
 *
 * Three changes. Landmarks are gone. Keywords are gone — a model plus web
 * search cannot know what people type, and DataForSEO can, for well under a
 * dollar a city; `research.keywords` is now populated from the provider and
 * passed in by the caller. And the two things that always mattered most —
 * subdivisions and local conditions — are now asked for explicitly and per
 * area, instead of being requested "in passing" and then discarded because
 * the schema had no field for them.
 * ═══════════════════════════════════════════════════════════════════════════ */

export function buildResearchPrompt(facts: Facts): string {
  return `Research the local market for a residential cleaning company that serves ${facts.city}, ${facts.stateName}. Search the web for each part below and report what you find. Everything you report must come from the pages you searched — never from memory or plausible reconstruction. If the web results do not support an item, leave it out and say so.
${notesBlock(facts)}
Report these four things:

(a) AREAS — 8 to 12 real, named places a cleaning company based in ${facts.city} would realistically serve: the surrounding suburbs and the well-known neighborhoods inside the city itself. Prefer places with actual residential housing and enough households to be worth a page. Give each one exactly as it is normally written locally (including any "St." / "Mt." / directional prefix), and note roughly where it sits relative to ${facts.city}.

  These must be places of the same KIND — municipalities and recognised neighborhoods. A named housing development inside one of them is NOT a separate area; it belongs in (b) under the area that contains it. Cinco Ranch is part of Katy, not a peer of Katy.

(b) SUBDIVISIONS AND DEVELOPMENTS — for each area in (a), the named residential subdivisions, master-planned communities or distinct neighborhoods within it that a resident would recognise. Aim for 3 to 6 per area. These are the most useful facts in this entire brief, and also the easiest to get wrong: report only names you actually found on a page. If you cannot find real ones for an area, say so plainly for that area — an area with no subdivisions found is a useful finding, and an invented development name is the worst possible outcome.

(c) HOUSING AND LOCAL CONDITIONS — twice over.

  For ${facts.city} as a whole: the climate and its seasons, the dominant housing stock and typical age and construction of homes, the usual flooring and foundation type, and any local condition that dirties a house — road salt, humidity and mold, hard water, pollen, desert dust, blowing sand, coastal salt air, wildfire smoke, year-round air conditioning.

  Then for each area in (a) separately: what the homes there are like — when they were built, roughly how large, whether they sit in master-planned communities with HOAs or on older streets — and anything specific to that area that affects how a house gets dirty or how a cleaning crew reaches it.

  For every condition you report, say what it MEANS for cleaning a home. "Humid subtropical climate" on its own is not useful; "humidity keeps bathrooms damp enough that grout and shower glass discolour faster than owners expect" is.

  Report income, poverty, flood or crime data ONLY if it is relevant to whether this is a workable market, and mark anything of that kind clearly as background — it will never appear on the website.

(d) ZIP CODES — the main residential ZIP codes of ${facts.city} itself, about 15 to 25 of them, as five-digit strings. Use an authoritative listing (a postal-service or municipal source), not a guess, and skip PO-box-only and non-residential codes.

Do NOT research or report phone numbers, street addresses, business names, prices, or contact details of any kind — those are supplied separately and anything you found would be wrong.`
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 5 · REPLACE RESEARCH_STRUCTURE_SYSTEM and buildResearchStructuringPrompt
 * ═══════════════════════════════════════════════════════════════════════════ */

export const RESEARCH_STRUCTURE_SYSTEM = `You convert a block of local-market research findings into strict JSON.

You are a transcriber, not a researcher and not a writer. Every area name, subdivision, ZIP code and local condition you output must appear in the findings text you are given. Do not add entries from your own knowledge, do not correct or "improve" spellings, and do not guess at a ZIP code or a development name that is not written in the findings. If the findings contain fewer items than requested, return fewer items — a short accurate list is correct, an invented one is not. An empty subdivisions array for an area is a valid and useful answer.

Drop anything the findings themselves flag as uncertain, disputed, or out of the service area, and drop any phone number, street address or business name that wandered into the findings — those fields do not exist in this output.

Mark a condition copySafe: false when it is background for deciding whether to work a market rather than something a cleaning company would ever print: household income, poverty, crime, flood risk, property values. Everything about climate, weather, housing construction and what dirties a home is copySafe: true.`

export function buildResearchStructuringPrompt(
  findings: string,
  facts: Facts,
  keywords: readonly string[]
): string {
  return `Below are research findings for ${facts.city}, ${facts.stateName}. Convert them into the required JSON.

suburbs — one entry per real AREA named in the findings (aim for the 8 to 12 they contain). A named subdivision inside an area is never its own entry; it goes in that area's subdivisions array. Each entry has:
  name: the place name exactly as the findings write it, e.g. "St. Louis Park", "Sugar Land".
  slug: that name lowercased, with spaces and punctuation replaced by single hyphens — "St. Louis Park" gives "st-louis-park". Nothing else: no prefix, no suffix. Unique, lowercase, a-z 0-9 and hyphens only.
  subdivisions: the named developments and neighborhoods the findings place inside this area. Empty array if the findings name none — do not fill it from your own knowledge.
  housingCharacter: one or two sentences from the findings on what the homes there are like — era, size, construction, whether they sit in master-planned communities.
  conditions: the local conditions the findings give for THIS area specifically, each with what it means for cleaning.

conditions — the metro-wide conditions from the findings, each with its cleaning implication and its copySafe flag.

zips — the five-digit ZIP codes from the findings, as strings, ascending, deduplicated.

keywords — use exactly this list, unchanged. It comes from search-volume data, not from the findings:
${keywords.map((k) => `  ${k}`).join('\n')}

FINDINGS
${findings}`
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 6 · NEW — the uniqueness gate
 *
 * Research returns 8 to 12 areas and, until now, every one of them became a
 * page. Nothing asked whether there was enough to say about it.
 *
 * Minneapolis is the argument: Vadnais Heights ran 745 impressions and zero
 * clicks across sixteen months, Richfield 934 and zero. Those pages were never
 * going to earn anything, because there was nothing on them that was not on
 * the other twenty-two. An area with no distinct local material produces a
 * doorway page by construction, and no amount of prompt quality fixes it.
 *
 * Runs after normalizeResearchSlugs, in the same place and in the same spirit:
 * deterministic, in code, before anything downstream can consume it.
 * ═══════════════════════════════════════════════════════════════════════════ */

export type SuburbVerdict = 'build' | 'review' | 'skip'

export interface ScoredSuburb {
  suburb: Suburb
  score: number
  verdict: SuburbVerdict
  reason: string
}

const BUILD_THRESHOLD = 8
const REVIEW_THRESHOLD = 4

/** Distinct, publishable local material. Subdivisions count double —
 *  they are the field a competitor cannot fake and a resident checks. */
export function scoreSuburb(suburb: Suburb): number {
  const safeConditions = suburb.conditions.filter((c: Condition) => c.copySafe).length
  const housing = suburb.housingCharacter.trim() === '' ? 0 : 2
  return suburb.subdivisions.length * 2 + safeConditions + housing
}

export function scoreSuburbs(research: ResearchOutput): ScoredSuburb[] {
  return research.suburbs.map((suburb) => {
    const score = scoreSuburb(suburb)
    const verdict: SuburbVerdict =
      score >= BUILD_THRESHOLD ? 'build' : score >= REVIEW_THRESHOLD ? 'review' : 'skip'
    const reason =
      verdict === 'build'
        ? `${suburb.subdivisions.length} subdivisions, ${suburb.conditions.filter((c) => c.copySafe).length} local conditions`
        : verdict === 'review'
          ? 'thin — enough for a page only if search demand justifies it'
          : 'too little distinct local material; a page here would duplicate its siblings'
    return { suburb, score, verdict, reason }
  })
}

/**
 * Drops 'skip' areas. 'review' areas are KEPT and surfaced in the admin
 * review screen (suburbs-editor.tsx) with their score and reason, so an
 * operator removes them deliberately rather than by default — the operator
 * knows things the research does not, and a silent drop is worse than a
 * flagged one.
 */
export function applyUniquenessGate(research: ResearchOutput): {
  research: ResearchOutput
  scored: ScoredSuburb[]
} {
  const scored = scoreSuburbs(research)
  const kept = scored.filter((s) => s.verdict !== 'skip').map((s) => s.suburb)
  return { research: { ...research, suburbs: kept }, scored }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 7 · NEW — the suburb stage system prompt
 * ═══════════════════════════════════════════════════════════════════════════ */

export const SUBURB_SYSTEM = `${SYSTEM_BASE}

STAGE: one area page. You are writing about ONE place that this branch serves, for people who live there.

YOU OWN THE PLACE, NOT THE SERVICE. Every service has its own page and the reader is one click from any of them. If you find yourself explaining what a deep clean includes, or listing what a standard visit covers, stop — that is a different page and repeating it here makes both weaker. Your subject is this area: the homes in it, what those homes are like, and what living there does to them.

THE TEST. Read back what you wrote and ask whether a single paragraph of it would sit unchanged on the page for a neighbouring area. If it would, it is filler and you have not used the research. The named developments, the age and size of the houses, the way the streets and driveways work — those are what make this page about this place.

DO NOT reuse sentence constructions from any example you were shown. Match what an example does, never how it says it. If an example paragraph is short enough that matching its shape would mean reproducing it, write something different instead.`

/* ═══════════════════════════════════════════════════════════════════════════
 * 8 · NEW — the suburb prompt builder
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Structural exemplar. Deliberately NOT taken from the live Savage page that
 * src/data/suburb.ts was transcribed from: that page is one of the twenty-four
 * that produced twenty-three clicks in sixteen months, and it is exactly the
 * register we are trying to leave behind.
 *
 * This is the generated Houston deep-cleaning paragraph — the one piece of
 * output this pipeline has produced that does the job properly. It names a
 * real condition, says what that condition does inside a house, and lands on
 * the cleaning. That movement is what the model should copy.
 */
const EXEMPLAR_LOCAL =
  'Gulf humidity keeps bathrooms and closets damp enough for mildew to settle in, the air conditioning runs nearly year round and pushes dust through every room, and spring oak pollen coats windowsills and blinds.'

export function buildSuburbPrompt(
  facts: Facts,
  research: ResearchOutput,
  suburb: Suburb
): string {
  const safe = suburb.conditions.filter((c) => c.copySafe)
  const metroSafe = research.conditions.filter((c) => c.copySafe)
  const conditionLines = [...safe, ...metroSafe]
    .map((c) => `- ${c.condition} — ${c.implication}`)
    .join('\n')

  const siblings = research.suburbs
    .filter((s) => s.slug !== suburb.slug)
    .map((s) => s.name)
    .join(', ')

  return `Write the area-page copy for ${suburb.name}, which this ${facts.city} branch serves.
${notesBlock(facts)}
NAMED DEVELOPMENTS AND NEIGHBORHOODS in ${suburb.name}. Use at least three of these by name. Use only these — never add one:
${suburb.subdivisions.map((s) => `- ${s}`).join('\n')}

WHAT THE HOMES HERE ARE LIKE:
${suburb.housingCharacter}

LOCAL CONDITIONS, and what each one means for cleaning a house. The ones listed first are specific to ${suburb.name}; the rest are true across ${facts.city}. Lead with the specific ones:
${conditionLines}

OTHER AREAS this branch serves, each with its own page. Do NOT write anything that would sit equally well on one of theirs:
${siblings}

Produce three paragraphs.

1. intro — 60 to 90 words. That we clean homes in ${suburb.name}, and one concrete thing about the place that shapes the work. Do not open with the area name followed by a comma. Do not open with a question.

2. homes — 90 to 130 words. What the houses in ${suburb.name} are actually like, naming at least three of the developments above, and what that means for cleaning them: the size of the rooms, the flooring, the age of the fittings, whether these are newer builds or older streets. A reader who lives there should recognise their own house.

3. local — 90 to 130 words. The conditions above, turned into cleaning. What gets into these homes, where it settles, and what we do about it. Lead with what is specific to ${suburb.name} before anything that is true of ${facts.city} generally.

   STRUCTURAL EXAMPLE — note only the movement, condition to what it does indoors to the cleaning. Write entirely different sentences and carry over no Houston detail:
   ${EXEMPLAR_LOCAL}`
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 9 · ADD to MODEL_KEYS
 *
 * Keyed per area so StubModelClient fixtures can differ between them — a stub
 * that returned one blob for every area would hide precisely the failure the
 * similarity check exists to catch.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const MODEL_KEYS = {
  research: 'research',
  researchStructure: 'research.structure',
  front: 'front',
  deep: 'deep',
  suburb: (slug: string) => `suburb.${slug}`,
} as const

/* ═══════════════════════════════════════════════════════════════════════════
 * 10 · NEW case in executeStage
 *
 * The only stage that makes more than one model call, so it is the only one
 * that has to be resumable INSIDE itself. Twelve areas at one call each will
 * meet a serverless timeout or a transient API error eventually, and redoing
 * eleven good areas to recover the twelfth is both slow and expensive.
 *
 * Two things make that work: areas whose slots already exist are skipped, and
 * the draft is saved after each one. Stage-level `done` is still appended once
 * at the end by the existing code in executeStage.
 * ═══════════════════════════════════════════════════════════════════════════ */

/*
    case 'suburb': {
      const research = requireResearch(draft, key, stage)
      await appendProgress(key, {
        stage: 'suburb',
        kind: 'start',
        label: `Writing ${research.suburbs.length} area pages for ${facts.city}`,
      })

      for (const suburb of research.suburbs) {
        const [introSlot, homesSlot, localSlot] = suburbSlots(suburb.slug)

        // Already written on an earlier attempt — skip, do not pay for it twice.
        if (
          draft.sections[introSlot] !== undefined &&
          draft.sections[homesSlot] !== undefined &&
          draft.sections[localSlot] !== undefined
        ) {
          continue
        }

        const out = await client.generate({
          schema: SuburbCopySchema,
          key: MODEL_KEYS.suburb(suburb.slug),
          system: SUBURB_SYSTEM,
          prompt: buildSuburbPrompt(facts, research, suburb),
        })

        draft.sections[introSlot] = out.intro
        draft.sections[homesSlot] = out.homes
        draft.sections[localSlot] = out.local

        // Save per area: this is what makes the loop resumable.
        await saveDraft(key, draft)

        await appendProgress(key, {
          stage: 'suburb',
          kind: 'found',
          label: `${suburb.name} — ${suburb.subdivisions.length} developments named`,
        })
      }

      await appendProgress(key, {
        stage: 'suburb',
        kind: 'done',
        label: `${research.suburbs.length} area pages written`,
      })
      break
    }
*/

/* ═══════════════════════════════════════════════════════════════════════════
 * 11 · CHANGES ELSEWHERE
 *
 * src/content/drafts.ts
 *   REQUIRED_SLOTS becomes requiredSlots(research): the ten static ids minus
 *   the two retired home slots, plus three per area. finalizeDraft already
 *   holds `draft.research` at the point it copies sections, so it can call it
 *   directly. Its "missing slots" error message gets more useful for free.
 *
 * src/content/types.ts
 *   CityContent.research gains conditions / subdivisions / housingCharacter
 *   and loses landmarks. mapEmbedUrl is untouched.
 *
 * src/content/validate.ts
 *   Mirror the same shape. Keep the accumulate-then-throw behaviour — one bad
 *   city document should still 404 only that city.
 *
 * src/data/suburb.ts
 *   Three blocks move from token substitution to slots:
 *     hero.paragraphs[0]        -> s(c, `suburb.${slug}.intro`)
 *     houseCleaning.paragraph   -> s(c, `suburb.${slug}.homes`)
 *     benefits.paragraphs       -> s(c, `suburb.${slug}.local`)
 *   Everything else on that page stays template, correctly. suburbData()
 *   already receives the SuburbRef it needs to build the slot ids.
 *
 * src/data/home.ts + the Locations component
 *   Drop the two generated sentences. Render research.zips as a compact list.
 *   Remove the landmarks block entirely.
 *
 * regenerateStage
 *   Regenerating `research` must now also clear `suburb` — the area pages
 *   quote the subdivisions and conditions that research produced, so a new
 *   research run invalidates them exactly as it already invalidates front and
 *   deep. Add 'suburb' to that downstream list and drop 'home' from it.
 * ═══════════════════════════════════════════════════════════════════════════ */
