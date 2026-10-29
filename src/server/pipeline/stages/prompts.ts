// The prompts: system prompts, structural examples, and one builder per model call.

import type { Facts } from '@/server/pipeline/facts'
import { type ResearchOutput, type Suburb } from '@/server/pipeline/schemas'
import { SEARCH_BUDGET } from '@/server/pipeline/model'
import { BANNED_PHRASES, SUBDIVISIONS_REQUIRED } from '@/server/content/quality'
import { isWritableArea } from '@/server/content/slots'
import { SERVICE_SLUGS, serviceBySlug } from '@/site/data/services/registry'
import type { ResearchSource } from '@/server/pipeline/sources'

// ── Shape examples: real Minneapolis copy, used as structural models in the prompts ──

const MPLS_HERO_PARAGRAPHS = [
  'As a local and insured business, Ivy Cleans is thrilled to be providing cleaning and janitorial services across various areas of Minneapolis. Our experienced team, backed by a life-long dedication to cleanliness, is committed to delivering outstanding house cleaning services that our loyal customers cherish. We are proudly invested in the exceptional results we achieve with every clean. Having established our roots in the industry, we can assertively declare that our business ethos is unmatched. We take care of all cleaning aspects, from all surfaces to the tiniest nooks, and always supersede our client’s expectations, a trait we believe sets us apart.',
  'That is why we hold fast to the notion that our services are the top most in the Minneapolis area. The cornerstone of our success lies in our diligent effort, our transparent communication, and our spectacular results. No matter what cleaning jobs come our way, we approach each one with the same level of enthusiasm and professionalism. No matter what aspect of our business you scrutinize, it is the epitome of excellence. We have meticulously refined our house cleaning services in Minneapolis, leaving no room for questions.',
  'Do you have a mess that needs cleaning? Or perhaps you’re after a cleaner household or workplace? Do you have any cleaning project on your radar?',
  'Whether it’s your home or business, give our professional cleaning company a call today, request your quote, and put our skills to an effective test!',
  'Call our professional cleaning company Ivy Cleans today, get an estimate of our prices and put us to the test!',
]

const MPLS_SERVICE_INTRO = [
  'Ivy Cleans is known to provide an array of professional cleaning services including home cleaning services and maid service in Minneapolis and nearby cities. Whether it’s residential or commercial cleaning, or even office upkeep, our team of professional house cleaners, with their years of experience, are equipped to handle any cleaning job, regardless of its size. We utilize top-notch cleaning products and equipment to ensure the best possible results for our clients. Understanding that people lead busy lives, we offer flexible services tailored to their convenience.',
  'Whether you live in a quiet suburb or the bustling heart of Minneapolis, one thing is certain – dusting is an unavoidable part of maintaining a clean home. With its varied climate, Minneapolis is prone to dust and allergen accumulation. Our dusting services ensure a breathable, dust-free environment for you and your family.',
  'Given Minneapolis’ infamous cold winters where indoor living is predominant, maintaining clean floors and carpets is vital. Our professional vacuuming services guarantee a home cleared of grime and dust, providing a sanitized and welcoming living environment.',
  'Just like the janitorial services we offer for local businesses, our residential cleaning services include comprehensive bathroom cleaning – a necessary yet often dreaded task. Despite Minneapolis’ unpredictable weather, it’s essential to ensure a clean and sanitized bathroom environment. Our bathroom cleaning services aim to eliminate germs and bacteria, providing a safe and healthy space for your family.',
  'The cold and snow-laden winters of Minneapolis might make window cleaning a daunting task but fret not as Ivy Cleans has got you covered. Our professional window cleaners ensure your windows are sparkling clean, free from dirt and streaks, providing a noticeably brighter living space.',
]

const MPLS_CARD_DUSTING =
  'Dusting is an essential part of keeping a home clean and healthy. Minneapolis area is known for its diverse climate, which can contribute to the buildup of dust and allergens in homes. Our dusting services ensure that your home is free from dust and other airborne particles, providing a healthier living environment for you and your family.'

const MPLS_CARD_VACUUMING =
  'Vacuuming is another crucial cleaning service that is particularly important in Minneapolis. The city’s cold winters mean that people spend more time indoors, leading to a buildup of dirt and debris on floors and carpets. Our professional vacuuming services ensure that your home is free from dirt and dust, providing a more pleasant and hygienic living environment.'

// ── System prompts ──

// shared prefix, byte-identical across stages for a future cache breakpoint
// The phrasings that mark copy as machine-written; interpolated into SYSTEM_BASE so prompt and checker agree.

export const SYSTEM_BASE = `You write website copy for Ivy Cleans, a local, insured residential and commercial cleaning company. Each Ivy Cleans website serves one specific city, and you are writing that city's copy. Everything you write must read as though the people who actually clean houses in that city wrote it about their own city.

VOICE
- First person plural, always: "we", "our team", "our professional house cleaners". Speak to the reader as "you" and about "your home" — never "the customer", never "clients may wish to".
- Plain, specific, confident. The register of a good tradesperson explaining the job at your kitchen table — not a brochure, not an advertisement, not a mission statement. Short sentences are fine. Say the concrete thing.
- Prefer a fact to an adjective. "Tile grout in a 2,400 square foot Cinco Ranch home takes our crew most of a morning" beats "we deliver exceptional results with meticulous attention to detail." A fact a resident recognises is worth more than any amount of praise.
- Contractions are welcome. Never open a paragraph with the city name followed by a comma, never open with a rhetorical question, and no exclamation marks.
- Full flowing paragraphs of real sentences. NEVER bullet points, NEVER headings, NEVER markdown, NEVER emoji. Every field you return is plain prose that will be dropped straight into a paragraph tag.
- The brand name is exactly "Ivy Cleans" — capital I, capital C, no other spelling.
- Use the typographic apostrophe ’ (U+2019) in every contraction and possessive. Never the straight ASCII apostrophe '. Write it’s, the city’s, your family’s.
- American English, US spelling, and no British idiom.

BANNED — these phrasings are the tells that mark copy as machine-written. Using one fails the page:
${BANNED_PHRASES.map((p) => `  "${p}"`).join('\n')}
  "peace of mind" and "exceptional" — at most once per page each.

SUBSTANCE — this is what separates a page worth reading from filler
- Ground the copy in the real city: its climate and seasons, its housing stock (historic bungalows, brick row houses, ranch homes, stucco, high-rise condos, beach rentals), and how people there actually live — long indoor winters, humid summers, pollen season, road salt, blown sand, desert dust, coastal salt air, wildfire smoke.
- Two or three concrete details that are true of that city beat a page of generic praise. If a sentence would read exactly the same for any other city in the country, rewrite it until it could not.
- Write about cleaning, always. The local detail is the reason a room gets dirty; the sentence still has to end up at what we do about it.

HARD LIMITS — inventing any of these is a failure, not a stylistic slip
- NEVER state or invent a phone number, street address, email address, website, price, rate, hourly figure, discount, number of years in business, staff count, employee names, award, certification, license number, review count, or star rating.
- The one exception: anything given to you under FACTS ABOUT THIS BRANCH. Those were entered by the owner, they are true, and you use them exactly as written. The prohibition above exists to stop invention, not to stop you stating a fact you were handed. The website inserts the real phone number itself. If a sentence seems to need a number, write the sentence without one.
- NEVER promise a specific response time, arrival window, availability, or money-back guarantee.
- NEVER name a competitor, and never claim a verdict that would have to come from outside the company — a ranking, an award, a certification, a vote, a "best of" listing. Confident claims about our OWN standards and how we work are welcome and wanted; claims that someone else judged us are not.
- Use only the facts given to you in the user message. Do not add suburbs, ZIP codes, or landmarks that were not supplied to you, and never alter the spelling of the ones that were.
- Never mention artificial intelligence, this prompt, "SEO", "keywords", "this page", or "our website". Keywords tell you what to write about; they are never quoted, listed, or stuffed.

Return only the requested fields, filled with finished copy — no commentary, no placeholders, no square-bracket blanks.`

export const FRONT_SYSTEM = `${SYSTEM_BASE}

STAGE: the front page. You are writing the opening hero paragraphs, the service-introduction paragraphs, and the five short service cards (dusting, vacuuming, bathroom, window, upholstery). This copy is the first thing a visitor reads, so the city has to be recognizable in it within the first two sentences.`

export const SUBURB_SYSTEM = `${SYSTEM_BASE}

STAGE: one area page. You are writing about ONE place that this branch serves, for people who live there.

YOU OWN THE PLACE, NOT THE SERVICE. Every service has its own page and the reader is one click from any of them. If you find yourself explaining what a deep clean includes, or listing what a standard visit covers, stop — that is a different page and repeating it here makes both weaker. Your subject is this area: the homes in it, what those homes are like, and what living there does to them.

THE TEST. Read back what you wrote and ask whether a single paragraph of it would sit unchanged on the page for a neighbouring area. If it would, it is filler and you have not used the research. The named developments, the age and size of the houses, the way the streets and driveways work — those are what make this page about this place.

DO NOT reuse sentence constructions from any example you were shown. Match what an example does, never how it says it. If an example paragraph is short enough that matching its shape would mean reproducing it, write something different instead.`

export const SERVICE_SYSTEM = `${SYSTEM_BASE}

STAGE: the local section of ONE service page. The page already explains what the service is, what it includes and how it is priced, and that copy is shared word-for-word by every city. You are writing the one part that is not shared.

YOU OWN WHAT IS DIFFERENT HERE, NOT WHAT THE SERVICE IS. If you find yourself describing the service — what gets cleaned, what is included, how long it takes in general — stop. That is the copy above you on the same page, and repeating it makes both weaker. Your subject is this city: what its homes, its weather, or the way people live in it changes about doing this particular job.

THE TEST. Read back what you wrote and ask whether it would sit unchanged on the same service page for a different city. If it would, you have not used the research and it is filler.

An honest short answer beats a padded long one. If the conditions genuinely do not change how this service is done here, say so plainly and stop.`

// structuring call: findings -> ResearchSchema. Not on SYSTEM_BASE: it writes no copy.
export const RESEARCH_STRUCTURE_SYSTEM = `You convert a block of local-market research findings into strict JSON.

You are a transcriber, not a researcher and not a writer. Every area name, subdivision, ZIP code and local condition you output must appear in the findings text you are given. Do not add entries from your own knowledge, do not correct or "improve" spellings, and do not guess at a ZIP code or a development name that is not written in the findings. If the findings contain fewer items than requested, return fewer items — a short accurate list is correct, an invented one is not. An empty subdivisions array for an area is a valid and useful answer.

Drop anything the findings themselves flag as uncertain, disputed, or out of the service area, and drop any phone number, street address or business name that wandered into the findings — those fields do not exist in this output.

Mark a condition copySafe: false when it is background for deciding whether to work a market rather than something a cleaning company would ever print: household income, poverty, crime, flood risk, property values. Everything about climate, weather, housing construction and what dirties a home is copySafe: true.`

// ── Prompt builders ──


// the operator's market facts, or '' — facts the model must use, as given
function opsBlock(facts: Facts): string {
  const o = facts.ops
  if (!o) return ''
  const lines: string[] = []
  if (o.servingSince) lines.push(`- We have served ${facts.city} since ${o.servingSince}. Say it once, plainly.`)
  if (o.crewLead) lines.push(`- The crew here is led by ${o.crewLead}. Use the first name once, naturally — never invent a surname.`)
  if (o.crewSize) lines.push(`- The crew is ${o.crewSize} people.`)
  if (o.homesCleaned) lines.push(`- We have cleaned ${o.homesCleaned.toLocaleString()} homes in this market. Use the number as written; do not round it up.`)
  if (o.reviews?.length) {
    lines.push('- Real reviews from customers in this market. Quote at most two, VERBATIM, attributed by first name and area:')
    for (const r of o.reviews) lines.push(`    "${r.quote}" — ${r.firstName}, ${r.area}`)
  }
  if (lines.length === 0) return ''
  return `\nFACTS ABOUT THIS BRANCH — every one of these is true, and you must use each one that appears here. Do not embellish them, do not round them, and do not invent a companion fact to sit beside them.\n${lines.join('\n')}\n`
}


function numberedExample(paragraphs: string[]): string {
  return paragraphs.map((p, i) => `${i + 1}. ${p}`).join('\n\n')
}

// Research is three passes. City-wide first (it feeds every page and was the part that ran out of searches),
// then the area list, then one short pass per area. Keywords come from DataForSEO, not from research.

function searchBudgetLine(n: number): string {
  return `You have ${n} web searches for this task, no more. Run them ONE AT A TIME and read each result before choosing the next; a batch fired at once is rejected. When the tool reports the limit is reached, do not try again — write up what you have found so far.`
}

/** Pass 1: the city as a whole — climate, housing stock, what dirties a home. */
export function buildMetroResearchPrompt(facts: Facts): string {
  return `Research ${facts.city}, ${facts.stateName} for a residential cleaning company that serves it. Search the web and report what you find. Everything you report must come from the pages you searched — never from memory or plausible reconstruction. If the web results do not support an item, leave it out and say so.

${searchBudgetLine(SEARCH_BUDGET.metro)}
${opsBlock(facts)}
Report HOUSING AND LOCAL CONDITIONS for ${facts.city} as a whole: the climate and its seasons, the dominant housing stock and typical age and construction of homes, the usual flooring and foundation type, and any local condition that dirties a house — road salt, humidity and mold, hard water, pollen, desert dust, blowing sand, coastal salt air, wildfire smoke, year-round air conditioning.

  For every condition you report, say what it MEANS for cleaning a home. "Humid subtropical climate" on its own is not useful; "humidity keeps bathrooms damp enough that grout and shower glass discolour faster than owners expect" is.

  Report income, poverty, flood or crime data ONLY if it is relevant to whether this is a workable market, and mark anything of that kind clearly as background — it will never appear on the website.

Do NOT research or report phone numbers, street addresses, business names, prices, or contact details of any kind — those are supplied separately and anything you found would be wrong.`
}

/** Pass 2: the areas, and which of them border which. */
export function buildAreasResearchPrompt(facts: Facts): string {
  return `Research the areas a residential cleaning company based in ${facts.city}, ${facts.stateName} would realistically serve. Search the web and report what you find. Everything you report must come from the pages you searched — never from memory. If the web results do not support an item, leave it out.

${searchBudgetLine(SEARCH_BUDGET.areas)}
${opsBlock(facts)}
AREAS — 8 to 10 real, named places: the surrounding suburbs and the well-known neighborhoods inside the city itself. Prefer places with actual residential housing and enough households to be worth a page. Give each one exactly as it is normally written locally (including any "St." / "Mt." / directional prefix), note roughly where it sits relative to ${facts.city}, and name the two to four OTHER areas from your list it borders or sits next to — the site links neighbouring area pages to each other, and only real adjacency counts.

These must be places of the same KIND — municipalities and recognised neighborhoods. A named housing development inside one of them is NOT a separate area. Cinco Ranch is part of Katy, not a peer of Katy.

Do NOT report phone numbers, street addresses, business names, prices, or contact details.`
}

/** Pass 3, once per area: its subdivisions, housing and conditions. */
export function buildAreaResearchPrompt(facts: Facts, area: string, allAreas: readonly string[]): string {
  const others = allAreas.filter((a) => a !== area)
  return `Research ${area}, an area near ${facts.city}, ${facts.stateName}, for a residential cleaning company that serves it. Search the web and report what you find. Everything you report must come from the pages you searched — never from memory or plausible reconstruction. If the web results do not support an item, say so plainly.

${searchBudgetLine(SEARCH_BUDGET.area)}

Report three things about ${area} only.

(1) SUBDIVISIONS AND DEVELOPMENTS — the named residential subdivisions, master-planned communities or distinct neighborhoods within ${area} that a resident would recognise. Aim for 3 to 6. These are the most useful facts in this brief, and the easiest to get wrong: report only names you actually found on a page. If you cannot find real ones, say so — an area with no subdivisions found is a useful finding, and an invented development name is the worst possible outcome.

(2) HOUSING — what the homes in ${area} are like: when they were built, roughly how large, whether they sit in master-planned communities with HOAs or on older streets.

(3) LOCAL CONDITIONS — anything specific to ${area} that affects how a house gets dirty or how a cleaning crew reaches it (gated communities, lakefront grit, new construction dust, mature tree canopy). For each, say what it MEANS for cleaning a home.

${others.length ? `The other areas this branch serves are ${others.join(', ')}. If a page says which of these ${area} borders, note it.` : ''}

Do NOT report phone numbers, street addresses, business names, prices, or contact details.`
}

/** The findings of all passes as one document, in the lettered order the structuring pass expects. */
export function composeFindings(
  parts: { metro: string; areas: string; perArea: Record<string, string> },
  sources: readonly ResearchSource[],
): string {
  const areaSections = Object.entries(parts.perArea)
    .map(([name, text]) => `## ${name}\n${text}`)
    .join('\n\n')
  const findings = `# (c) part 1 — CITY-WIDE HOUSING AND CONDITIONS\n${parts.metro}\n\n# (a) AREAS\n${parts.areas}\n\n# (b) and (c) part 2 — PER AREA: subdivisions, housing, conditions\n${areaSections}`
  if (sources.length === 0) return findings
  const list = sources
    .map((s) => [`${s.id} · ${s.title} · ${s.url}`, ...s.quotes.map((q) => `  "${q}"`)].join('\n'))
    .join('\n')
  return `${findings}\n\n# SOURCES\n${list}`
}

// findings -> ResearchSchema. No supplied keywords: the model derives them. A list: it uses that list.
export function buildResearchStructuringPrompt(
  findings: string,
  facts: Facts,
  keywords: readonly string[]
): string {
  const keywordsSection =
    keywords.length === 0
      ? 'keywords — return an empty array. Search phrases come from a separate source, never from these findings.'
      : `keywords — use exactly this list, unchanged. It comes from search-volume data, not from the findings:\n${keywords.map((k) => `  ${k}`).join('\n')}`

  return `Below are research findings for ${facts.city}, ${facts.stateName}. Convert them into the required JSON.

EVERY ARRAY, ALL OF THEM. The findings are written in lettered parts and every part has somewhere to go: (a) and (b) become suburbs and their subdivisions, (c) becomes housingCharacter plus the two condition arrays. Work through the findings part by part and fill each array from its part. A field left empty because you stopped reading is the one failure this task can produce — you are transcribing, and everything present in the findings must come out the other side.

suburbs — one entry per real AREA named in the findings (aim for the 8 to 12 they contain). A named subdivision inside an area is never its own entry; it goes in that area's subdivisions array. Each entry has:
  name: the place name exactly as the findings write it, e.g. "St. Louis Park", "Sugar Land".
  slug: that name lowercased, with spaces and punctuation replaced by single hyphens — "St. Louis Park" gives "st-louis-park". Nothing else: no prefix, no suffix. Unique, lowercase, a-z 0-9 and hyphens only.
  subdivisions: the named developments and neighborhoods the findings place inside this area. Empty array if the findings name none — do not fill it from your own knowledge.
  housingCharacter: one or two sentences from the findings on what the homes there are like — era, size, construction, whether they sit in master-planned communities.
  conditions: the local conditions the findings give for THIS area specifically, each with what it means for cleaning.
  neighbors: the two to four OTHER areas from this same suburbs list that the findings say border or sit next to this one, by their exact names. Only areas that are entries in this list; empty array if the findings give no sense of where it sits.

conditions — the METRO-WIDE conditions, the ones true across ${facts.city} rather than of one area. The findings report these in part (c), the first half, before the per-area breakdown. Each needs its condition, its cleaning implication, and its copySafe flag.
  This array is separate from the per-area conditions above and is NOT optional when the findings contain metro-wide material. Climate, humidity, seasons, air conditioning, pollen, hard water, road salt, dust, the dominant construction and flooring of the metro — all of it belongs here.
  Returning [] tells every downstream page that ${facts.city} has no city-wide character. If the findings genuinely contain none, return [] — but re-read part (c) first, because the brief asks for it explicitly and its absence is unusual.

${keywordsSection}

FINDINGS
${findings}`
}

/** Front page: hero paragraphs, service intro, five cards. */
export function buildFrontPrompt(facts: Facts, research: ResearchOutput): string {
  const suburbList = research.suburbs.map((s) => s.name).join(', ')
  // omit an empty section: a bare header invites invention
  const keywordSection =
    research.keywords.length === 0
      ? ''
      : `\nSEARCH PHRASES people here use to find a cleaner. Write copy that would genuinely answer these searches — never quote or list them:\n${research.keywords.map((k) => `- ${k}`).join('\n')}\n`

  return `Write the front-page copy for the Ivy Cleans website serving ${facts.city}, ${facts.stateName}.
${opsBlock(facts)}
${keywordSection}
AREAS this branch serves, for your awareness only — do not list them in this copy, they have their own section on the page:
${suburbList}

Produce three things.

1. heroParagraphs — exactly 5 paragraphs, following this arc, one paragraph per step:
   1) Who we are and where we work: a local, insured business providing cleaning and janitorial services across ${facts.city}; our experienced team, our care for detail, what our customers get. Roughly 80 to 110 words.
   2) Confidence: why our work in ${facts.city} stands up to scrutiny — effort, clear communication, results, the same standard on every job regardless of size. Roughly 70 to 90 words.
   3) Three questions a homeowner in ${facts.city} might actually be asking themselves — about their own house, their schedule, or one specific room — one sentence each, in a single paragraph. Under 35 words in total. Every question must be one this city's conditions make likely; a question that could be asked anywhere is wrong here.
   4) One sentence: home or business, call our professional cleaning company today and request a quote.
   5) One sentence: call Ivy Cleans today and get an estimate. Similar in spirit to paragraph 4 but not a repeat of its wording.

   STRUCTURAL EXAMPLE — this is the Minneapolis version of the first two of these paragraphs. Match its SHAPE, its paragraph lengths and its rhythm; never copy its sentences, and never carry over a Minneapolis detail. This shows the length and structure only — its voice is not the target, the VOICE section above is. Paragraph 3 is deliberately NOT shown: every city that saw the Minneapolis questions wrote the same three.
${numberedExample(MPLS_HERO_PARAGRAPHS.slice(0, 2))}

   Paragraphs 4 and 5 are one sentence each, so there is no shape left to imitate once you match it — write them to the spec in steps 4 and 5 above: a direct call to action, then a request for a quote or estimate close in spirit to it but not a repeat of its wording. Do not imitate a sample sentence for either.

2. serviceIntro — exactly 5 paragraphs:
   1) An overview: the range of professional cleaning services we provide in ${facts.city} and nearby areas — residential, commercial, office upkeep, maid service — our experienced house cleaners, quality products and equipment, and flexible scheduling for busy people. Roughly 80 to 100 words.
   2) Dusting, tied to something specific about ${facts.city}: what puts dust and allergens into homes there. 35 to 55 words.
   3) Vacuuming, tied to how the seasons and daily life in ${facts.city} bring dirt onto floors and carpets. 35 to 55 words.
   4) Bathroom cleaning, tied to the local climate — humidity, damp, hard water, whatever is true there — and ending on germs, safety and a healthy space. 35 to 55 words.
   5) Window cleaning, tied to what actually dirties windows in ${facts.city}, ending on a brighter home. 35 to 55 words.

   STRUCTURAL EXAMPLE — the Minneapolis version of these five paragraphs. Note how each one names a real local condition and then turns to the service. Match the shape, never the sentences. This shows the length and structure only — its voice is not the target, the VOICE section above is.
${numberedExample(MPLS_SERVICE_INTRO)}

3. cards — one self-contained paragraph for each of the five services, 55 to 75 words each: dusting, vacuuming, bathroom, window, upholstery. Each card names the service, gives the reason it matters specifically in ${facts.city} (climate, housing, how people live), and closes on what our service delivers for the reader's home. These cards sit beside the paragraphs above on the same page — they must cover the same ground WITHOUT reusing their sentences or phrasing.

   STRUCTURAL EXAMPLES — the Minneapolis dusting and vacuuming cards. Match their length and construction; write entirely different sentences, and carry over no Minneapolis detail. This shows the length and structure only — its voice is not the target, the VOICE section above is.
   dusting: ${MPLS_CARD_DUSTING}
   vacuuming: ${MPLS_CARD_VACUUMING}

   Note that the real Minneapolis card and its matching intro paragraph overlap heavily. Yours must not — the two sit on one page and a reader sees both.`
}

const EXEMPLAR_LOCAL =
  'Gulf humidity keeps bathrooms and closets damp enough for mildew to settle in, the air conditioning runs nearly year round and pushes dust through every room, and spring oak pollen coats windowsills and blinds.'

// One area page: intro, homes, local. Area conditions first, then metro; both filtered to copySafe.
export function buildSuburbPrompt(
  facts: Facts,
  research: ResearchOutput,
  suburb: Suburb
): string {
  // the homes paragraph needs at least three subdivisions; the gate should have skipped this
  if (!isWritableArea(suburb)) {
    throw new Error(
      `cannot write the area page for "${suburb.name}": no subdivisions were researched for it, and the homes paragraph must name real ones rather than invent one. The uniqueness gate should have dropped this area before it reached generation.`
    )
  }

  // ask for what exists: 'at least three' over two invites inventing the third
  const nameCount = numberWord(Math.min(SUBDIVISIONS_REQUIRED, suburb.subdivisions.length))

  const safe = suburb.conditions.filter((c) => c.copySafe)
  const metroSafe = research.conditions.filter((c) => c.copySafe)
  const conditionLines = [...safe, ...metroSafe]
    .map((c) => `- ${c.condition} — ${c.implication}`)
    .join('\n')

  const siblings = research.suburbs
    .filter((s) => s.slug !== suburb.slug)
    .map((s) => s.name)
    .join(', ')

  // omit an empty section: a bare header invites invention
  const housingSection =
    suburb.housingCharacter.trim() === ''
      ? ''
      : `\n\nWHAT THE HOMES HERE ARE LIKE:\n${suburb.housingCharacter}`

  const conditionsSection =
    conditionLines === ''
      ? ''
      : `\n\nLOCAL CONDITIONS, and what each one means for cleaning a house. The ones listed first are specific to ${suburb.name}; the rest are true across ${facts.city}. Lead with the specific ones:\n${conditionLines}`

  return `Write the area-page copy for ${suburb.name}, which this ${facts.city} branch serves.
${opsBlock(facts)}
NAMED DEVELOPMENTS AND NEIGHBORHOODS in ${suburb.name}. Use at least ${nameCount} of these by name. Use only these — never add one:
${suburb.subdivisions.map((s) => `- ${s}`).join('\n')}${housingSection}${conditionsSection}

OTHER AREAS this branch serves, each with its own page. Do NOT write anything that would sit equally well on one of theirs:
${siblings}

Produce three paragraphs.

1. intro — 60 to 90 words. That we clean homes in ${suburb.name}, and one concrete thing about the place that shapes the work. Do not open with the area name followed by a comma. Do not open with a question.

2. homes — 90 to 130 words. What the houses in ${suburb.name} are actually like, naming at least three of the developments above, and what that means for cleaning them: the size of the rooms, the flooring, the age of the fittings, whether these are newer builds or older streets. A reader who lives there should recognise their own house.

3. local — 90 to 130 words. The conditions above, turned into cleaning. What gets into these homes, where it settles, and what we do about it. Lead with what is specific to ${suburb.name} before anything that is true of ${facts.city} generally.

   STRUCTURAL EXAMPLE — note only the movement, condition to what it does indoors to the cleaning. Write entirely different sentences and carry over no Houston detail:
   ${EXEMPLAR_LOCAL}

4. links — up to three phrases you have ALREADY WRITTEN in the three paragraphs above that naturally describe a service this branch offers. For each, give the paragraph it sits in (intro, homes or local), the phrase word for word as it appears there, and the service it belongs to, one of: ${SERVICE_SLUGS.join(', ')}. At least three words, at most sixty characters, and it must read as something a reader would click. Do not write a phrase in order to link it — if nothing fits, return an empty list.`
}

/** Prompts read as prose to the model, so a small count is spelled out. */
function numberWord(n: number): string {
  return ['zero', 'one', 'two', 'three'][n] ?? String(n)
}

// The local section of one service page — the one per-city paragraph. Capped at two metro conditions:
// without the cap all six pages covered the same four. Throws for the bespoke move-out slug.
export function buildServiceLocalPrompt(
  facts: Facts,
  research: ResearchOutput,
  slug: string
): string {
  const entry = serviceBySlug(slug)
  if (entry === undefined || entry.kind !== 'template') {
    throw new Error(
      `cannot write a local section for "${slug}": it is not a service that renders through the shared template, so nothing would ever display the result.`
    )
  }

  const conditionLines = research.conditions
    .filter((c) => c.copySafe)
    .map((c) => `- ${c.condition} — ${c.implication}`)
    .join('\n')

  // omit an empty section: a bare header invites invention
  const conditionsSection =
    conditionLines === ''
      ? ''
      : `\n\nLOCAL CONDITIONS in ${facts.city}, with what each one means for cleaning:\n${conditionLines}`

  const areaNames = research.suburbs.map((s) => s.name)
  const areasSection =
    areaNames.length === 0
      ? ''
      : `\n\nAREAS this branch serves, for reference. Name one only where it genuinely belongs in the sentence:\n${areaNames.join(', ')}`

  return `Write the "In ${facts.city}" section for the ${entry.name} page.
${opsBlock(facts)}
The page already explains what ${entry.name} is, what is included, and how it is priced. That copy is fixed and shared by every city. Do not repeat any of it.

Your section answers one question: what is different about ${entry.name} in ${facts.city} specifically, because of the homes here, the climate, or how people live?${conditionsSection}${areasSection}

90 to 130 words. Use AT MOST TWO of the conditions above — the two that change THIS job most — and ignore the rest. Lead with the more specific of the two.

Working through every condition on the list is what makes six service pages read the same: they all get the same list, and only the service is different. The reader came for one service, not a weather report.

If none of the conditions genuinely change how this service is done here, say so plainly in two sentences rather than padding — "a move-out clean in ${facts.city} is the same job as anywhere; what changes is…" is an honest and useful paragraph, and a better one than three sentences of filler.

links — up to two phrases you have already written above that name one of the areas listed, each with that area's name exactly as listed. The phrase must appear word for word in your paragraph and contain the area name. If none, return an empty list.`
}
