// src/content/quality.ts
/*
 * Did the copy do the job the prompt gave it?
 *
 * similarity.ts asks the neighbouring question — "is this the same as some
 * other city's copy" — and catches duplication. These checks catch the
 * failures that are invisible to it: an area page that never named the
 * developments it was handed, a page that was given a real operator fact and
 * ignored it, a phrase the voice guide forbids.
 *
 * WHY IT MATTERS MORE AT 100 THAN AT 1: nobody is going to read 1,200 area
 * pages. These are how you know the strategy is being executed rather than
 * merely specified.
 *
 * WHY IT TAKES ONLY THE DOCUMENT: it runs at publish, where the draft sidecar
 * is already gone (publishCity deletes it). Everything needed is on
 * CityContent — `research.suburbs` for the entities, `ops` for the operator
 * facts, `sections` for the copy.
 *
 * WHAT THIS DELIBERATELY DOES NOT CHECK, and why:
 *
 *   Reading level. content-strategy.md lists Flesch 60-80 as an optional
 *   fourth check. A syllable counter accurate enough to be worth acting on is
 *   more than twenty lines, and an inaccurate one produces warnings an
 *   operator learns to ignore — which costs more than the check is worth.
 *
 *   "at most once per page" for `peace of mind` and `exceptional`. A page is
 *   several slots and this module sees slots, so "per page" has no honest
 *   definition here. Counting per slot would miss the real case; counting per
 *   document would flag a city for using a common phrase twice in twenty
 *   sections.
 *
 *   Convergence. Six service pages can each pass every check here while all
 *   saying the same four things in a different order — that happened, was
 *   measured, and was fixed in the prompt. Catching it needs a rubric call to
 *   a second model, which is content-strategy item E, not this file.
 */
import type { CityContent, MarketOps, Suburb } from './types'

/**
 * The phrasings that mark copy as machine-written.
 *
 * DEFINED HERE, not in src/pipeline/stages.ts where the prompt that forbids
 * them lives, and that is a cycle constraint rather than a preference:
 * stages.ts imports loadDraft/saveDraft from src/content/drafts.ts, and
 * drafts.ts imports this module to run the checks at publish. content ->
 * pipeline would close that loop. stages.ts imports the list from here
 * instead, so there is still exactly one definition — a second copy would
 * eventually forbid something nothing verifies, or fail copy the model was
 * never told to avoid.
 *
 * `peace of mind` and `exceptional` are NOT here. SYSTEM_BASE allows each
 * once per page, which is a rule this module cannot express (see the header).
 */
export const BANNED_PHRASES: readonly string[] = [
  'nestled in the heart of',
  "whether you're a busy professional",
  'we understand that every home',
  'look no further',
  "in today's fast-paced world",
  'hustle and bustle',
  'vibrant community',
  "we've got you covered",
  'trusted partner',
  'when it comes to',
  'at the end of the day',
  'second to none',
  'meticulous',
  'assertively declare',
  'put our skills to the test',
  'unmatched',
]

/**
 * How many of an area's own subdivisions its page has to name.
 *
 * Three is what buildSuburbPrompt asks for, and it is the strongest signal a
 * page carries that it is about ONE place. An area researched with fewer than
 * three cannot honestly supply three, so the requirement is capped at what
 * exists — the uniqueness gate only rejects an area with ZERO outright, so
 * one- and two-subdivision areas do reach generation.
 */
export const SUBDIVISIONS_REQUIRED = 3

export type QualityRule = 'entity-coverage' | 'ops-unused' | 'banned-phrase' | 'area-code'

export interface QualityFinding {
  /** The slot, or the area prefix when the finding spans an area's three slots. */
  slot: string
  rule: QualityRule
  /** One line an operator can act on without opening the page. */
  detail: string
  /**
   * Blocking findings refuse the publish; the rest are shown and let through.
   *
   * The split is "did this page fail to use something real it was given"
   * (blocking) versus "did it phrase something badly" (warn). The first is a
   * page that cannot be fixed by a reader's goodwill; the second is a
   * regeneration an operator can choose to spend.
   */
  blocking: boolean
}

/** Every slot's text, flattened — array slots joined, so one pass reads all copy. */
function allText(sections: CityContent['sections']): string {
  return Object.values(sections)
    .map((v) => (Array.isArray(v) ? v.join(' ') : v))
    .join(' ')
}

/** The three slots one area page is assembled from, as a single lowercased string. */
function areaText(sections: CityContent['sections'], slug: string): string {
  return ['intro', 'homes', 'local']
    .map((part) => sections[`suburb.${slug}.${part}`])
    .map((v) => (Array.isArray(v) ? v.join(' ') : (v ?? '')))
    .join(' ')
    .toLowerCase()
}

function entityCoverage(suburbs: readonly Suburb[], sections: CityContent['sections']): QualityFinding[] {
  const out: QualityFinding[] = []
  for (const suburb of suburbs) {
    // Nothing to demand: the gate drops these before generation, and a row
    // added by hand in the suburbs editor legitimately has none.
    if (suburb.subdivisions.length === 0) continue

    const required = Math.min(SUBDIVISIONS_REQUIRED, suburb.subdivisions.length)
    const page = areaText(sections, suburb.slug)
    const named = suburb.subdivisions.filter((name) => page.includes(name.toLowerCase()))

    if (named.length < required) {
      out.push({
        slot: `suburb.${suburb.slug}`,
        rule: 'entity-coverage',
        detail: `names ${named.length} of ${suburb.subdivisions.length} researched subdivisions; needs ${required}`,
        blocking: true,
      })
    }
  }
  return out
}

/**
 * A supplied operator fact that never reached the copy.
 *
 * ONLY crewLead and homesCleaned are enforced, and the omissions are
 * deliberate — a validator that cries wolf is one an operator learns to click
 * past. `servingSince` arrives as "2024-03" and the prompt asks for it
 * plainly, so a correct page writes "March 2024" and a literal check would
 * fail it. `crewSize` can honestly be spelled as a word. Reviews are quoted
 * "at most two", so quoting none is inside the instruction.
 *
 * Read across the WHOLE document, not the front page alone as
 * content-strategy.md's sketch does: a crew lead named on an area page or a
 * service page has been used, and reporting it unused would be a false alarm.
 */
function opsUsed(ops: MarketOps | undefined, sections: CityContent['sections']): QualityFinding[] {
  if (!ops) return []
  const text = allText(sections).toLowerCase()
  const out: QualityFinding[] = []

  if (ops.crewLead && !text.includes(ops.crewLead.toLowerCase())) {
    out.push({
      slot: 'sections',
      rule: 'ops-unused',
      detail: `crew lead "${ops.crewLead}" was supplied and never appears in the copy`,
      blocking: true,
    })
  }

  if (ops.homesCleaned !== undefined) {
    // opsBlock hands the model toLocaleString(), so the page is ASKED to
    // print "1,200". Accept either form rather than failing a page that did
    // exactly as it was told.
    const forms = [String(ops.homesCleaned), ops.homesCleaned.toLocaleString('en-US')]
    if (!forms.some((form) => text.includes(form.toLowerCase()))) {
      out.push({
        slot: 'sections',
        rule: 'ops-unused',
        detail: `homes cleaned (${ops.homesCleaned.toLocaleString('en-US')}) was supplied and never appears in the copy`,
        blocking: true,
      })
    }
  }

  return out
}

/**
 * North American area codes by state, for the one check that matters: does
 * this city's phone number plausibly belong to this city?
 *
 * Orlando shipped publicly with 346-644-6564 — a Houston code — on every
 * page, because the number is typed by hand on the create form and nothing
 * ever looked at it. The phone is the entire conversion path of a lead-gen
 * site.
 *
 * DELIBERATELY NOT EXHAUSTIVE and deliberately not authoritative. It catches
 * the obvious mismatch — a Texas number on a Florida city — and says nothing
 * at all about a state it does not carry, because a check that fires on
 * correct data is one an operator learns to ignore. Overlays and splits mean
 * this will drift; a missing code produces a warning, never a refusal.
 */
const AREA_CODES: Record<string, readonly string[]> = {
  AL: ['205', '251', '256', '334', '659', '938'],
  AZ: ['480', '520', '602', '623', '928'],
  CA: ['209', '213', '279', '310', '323', '341', '408', '415', '424', '442', '510', '530', '559', '562', '619', '626', '628', '650', '657', '661', '669', '707', '714', '747', '760', '805', '818', '820', '831', '840', '858', '909', '916', '925', '949', '951'],
  CO: ['303', '719', '720', '970', '983'],
  CT: ['203', '475', '860', '959'],
  FL: ['239', '305', '321', '324', '352', '386', '407', '448', '561', '656', '689', '727', '754', '772', '786', '813', '850', '863', '904', '941', '954'],
  GA: ['229', '404', '470', '478', '678', '706', '762', '770', '912', '943'],
  IL: ['217', '224', '309', '312', '331', '447', '464', '618', '630', '708', '773', '779', '815', '847', '872'],
  IN: ['219', '260', '317', '463', '574', '765', '812', '930'],
  MA: ['339', '351', '413', '508', '617', '774', '781', '857', '978'],
  MD: ['227', '240', '301', '410', '443', '667'],
  MI: ['231', '248', '269', '313', '517', '586', '616', '679', '734', '810', '906', '947', '989'],
  MN: ['218', '320', '507', '612', '651', '763', '924', '952'],
  MO: ['235', '314', '417', '557', '573', '636', '660', '816', '975'],
  NC: ['252', '336', '472', '704', '743', '828', '910', '919', '980', '984'],
  NJ: ['201', '551', '609', '640', '732', '848', '856', '862', '908', '973'],
  NV: ['702', '725', '775'],
  NY: ['212', '315', '329', '332', '347', '363', '516', '518', '585', '607', '624', '631', '646', '680', '716', '718', '838', '845', '914', '917', '929', '934'],
  OH: ['216', '220', '234', '283', '326', '330', '380', '419', '436', '440', '513', '567', '614', '740', '937'],
  OR: ['458', '503', '541', '971'],
  PA: ['215', '223', '267', '272', '412', '445', '484', '570', '582', '610', '717', '724', '814', '835', '878'],
  SC: ['803', '839', '843', '854', '864'],
  TN: ['423', '615', '629', '731', '865', '901', '931'],
  TX: ['210', '214', '254', '281', '325', '346', '361', '409', '430', '432', '469', '512', '621', '682', '713', '726', '737', '806', '817', '830', '832', '903', '915', '936', '940', '945', '956', '972', '979'],
  UT: ['385', '435', '801'],
  VA: ['276', '434', '540', '571', '703', '757', '804', '826', '948'],
  WA: ['206', '253', '360', '425', '509', '564'],
  WI: ['262', '274', '353', '414', '534', '608', '715', '920'],
}

/** Warns when a city's phone plainly belongs to a different state. */
function areaCode(doc: CityContent): QualityFinding[] {
  const codes = AREA_CODES[doc.state]
  if (!codes) return []
  const digits = doc.phone.replace(/\D/g, '')
  const code = digits.length === 11 ? digits.slice(1, 4) : digits.slice(0, 3)
  if (code === '' || codes.includes(code)) return []
  return [
    {
      slot: 'phone',
      rule: 'area-code',
      detail: `area code ${code} is not a ${doc.state} code — every page carries this number`,
      blocking: false,
    },
  ]
}

function bannedPhrases(sections: CityContent['sections']): QualityFinding[] {
  const out: QualityFinding[] = []
  for (const [slot, value] of Object.entries(sections)) {
    const text = (Array.isArray(value) ? value.join(' ') : value).toLowerCase()
    for (const phrase of BANNED_PHRASES) {
      if (text.includes(phrase)) {
        out.push({ slot, rule: 'banned-phrase', detail: `contains "${phrase}"`, blocking: false })
      }
    }
  }
  return out
}

/**
 * Every quality finding for a finished city document, blocking ones first.
 *
 * Ordered so the first line an operator reads is the one that will stop the
 * publish, rather than a phrasing warning that happens to sort earlier.
 * Returns [] for a document that did everything right — the review screen
 * renders nothing at all in that case, because a panel that always says
 * READY is one nobody reads.
 */
export function checkQuality(doc: CityContent): QualityFinding[] {
  const findings = [
    ...entityCoverage(doc.research.suburbs, doc.sections),
    ...opsUsed(doc.ops, doc.sections),
    ...bannedPhrases(doc.sections),
    ...areaCode(doc),
  ]
  return [...findings].sort((a, b) => Number(b.blocking) - Number(a.blocking))
}
