// The About page's gate, story prompt and story validator. Pure: the console action and the tests share it.
import { z } from 'zod'
import type { MarketOps } from '../content/types'

export const ABOUT_STORY_SLOT = 'about.story'

/** What the About page still needs before it publishes; [] when ready. */
export function aboutMissing(ops: MarketOps | undefined): string[] {
  const missing: string[] = []
  if (!ops?.servingSince) missing.push('serving since')
  if (!ops?.photos?.length) missing.push('one photo')
  return missing
}

export function aboutReady(ops: MarketOps | undefined): boolean {
  return aboutMissing(ops).length === 0
}

export const AboutStorySchema = z.object({ paragraphs: z.array(z.string()) }).strict()
export type AboutStory = z.infer<typeof AboutStorySchema>

export const ABOUT_SYSTEM =
  'You write the short "who we are" passage for a local house-cleaning company’s About page. Plain, warm, specific. ' +
  'Every name, number and date must come from the facts you are given; if a fact is not there, do not write around it and do not invent one. ' +
  'No superlatives, no slogans, no claims about awards, ratings or years of experience beyond the facts. Return JSON only.'

export type AboutFacts = {
  city: string
  state: string
  stateName: string
  ops: MarketOps
  areaNames: string[]
}

/** "2024-03" -> "March 2024"; a bare year or anything else is passed through. */
export function sinceLabel(servingSince: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(servingSince)
  if (!m) return servingSince
  const month = Number(m[2])
  if (month < 1 || month > 12) return servingSince
  const name = new Date(Date.UTC(2000, month - 1, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
  return `${name} ${m[1]}`
}

export function buildAboutStoryPrompt(facts: AboutFacts): string {
  const o = facts.ops
  const lines: string[] = []
  if (o.servingSince) lines.push(`- Ivy Cleans has served ${facts.city} since ${sinceLabel(o.servingSince)}.`)
  if (o.crewLead) lines.push(`- The ${facts.city} crew is led by ${o.crewLead} (first name only; never add a surname).`)
  if (o.crewSize) lines.push(`- The crew is ${o.crewSize} people.`)
  if (o.homesCleaned !== undefined) lines.push(`- ${o.homesCleaned.toLocaleString('en-US')} homes cleaned in ${facts.city} so far.`)
  return [
    `Write the "who we are" passage for Ivy Cleans in ${facts.city}, ${facts.stateName}.`,
    '',
    'FACTS. Use only these. Every one that appears must be used; nothing else may be asserted.',
    ...lines,
    '',
    'FORM. Two paragraphs, 90 to 140 words in total. Second person is welcome ("your home"). The brand is "Ivy Cleans", never "Ivy Cleans ' +
      facts.city +
      '". No numbers, years, or names other than the ones above. Do not quote reviews; the page prints those.',
    '',
    'DO NOT INVENT HOW THE BUSINESS RUNS. You know nothing about it beyond the facts above. So: say nothing about what any named person does other than lead the crew. ' +
      'No walk-throughs, scheduling, quotes, guarantees, checklists, supplies, arrival times, or "the same people every visit". No customers, pets, rooms or houses as anecdotes. ' +
      'Do not tell the reader to ask for anyone by name. Do not mention areas, suburbs or neighbourhoods. Do not refer to this page, to lists, or to anything "below" or "above". ' +
      'What is left is honest and enough: who we are, how long we have been here, who leads the crew, how many homes, and a plain invitation to get in touch.',
    '',
    'Return {"paragraphs": ["...", "..."]}.',
  ].join('\n')
}

const MONTHS = new Set(
  Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2000, i, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })),
)

const words = (text: string): string[] => text.split(/[^A-Za-z0-9'’]+/).filter(Boolean)

const INVENTED_CLAIM =
  /walk(?:s|ed|ing)?[- ]?through|schedul\w*|same (?:people|faces|crew|team|cleaners?)|this page|listed (?:below|above|here)|further down|guarantee\w*|checklist|on time|arrive\w*|our own supplies|background[- ]check\w*/i
// "ask for Bailey" sends the reader to a person; "homes that ask for it" does not. Case-sensitive on the name.
const ASK_FOR_PERSON = /\bask for [A-Z][a-z]+/

export type StoryCheck = { ok: true } | { ok: false; error: string }

/**
 * Every year, number and capitalised name in the story must trace to a fact. `knownText` is copy the site already
 * carries (the generated pages), so a place name the research uses is not treated as invented.
 */
export function validateAboutStory(story: AboutStory, facts: AboutFacts, knownText = ''): StoryCheck {
  const paragraphs = story.paragraphs.map((p) => p.trim()).filter(Boolean)
  if (paragraphs.length === 0 || paragraphs.length > 3) {
    return { ok: false, error: `expected 1 to 3 paragraphs, got ${paragraphs.length}` }
  }
  const text = paragraphs.join('\n\n')
  const wordCount = words(text).length
  if (wordCount > 260) return { ok: false, error: `too long: ${wordCount} words` }

  const o = facts.ops
  const sinceYear = o.servingSince ? /^(\d{4})/.exec(o.servingSince)?.[1] : undefined
  for (const m of text.matchAll(/\b(19|20)\d{2}\b/g)) {
    if (m[0] !== sinceYear) return { ok: false, error: `the year ${m[0]} is not a fact we were given` }
  }

  const allowedNumbers = new Set<string>()
  const addNumber = (n: number | undefined) => {
    if (n === undefined) return
    allowedNumbers.add(String(n))
    allowedNumbers.add(n.toLocaleString('en-US'))
  }
  addNumber(o.crewSize)
  addNumber(o.homesCleaned)
  addNumber(facts.areaNames.length)
  for (const m of text.matchAll(/\b\d[\d,]*\b/g)) {
    if (/^(19|20)\d{2}$/.test(m[0])) continue
    if (!allowedNumbers.has(m[0])) return { ok: false, error: `the number ${m[0]} is not a fact we were given` }
  }

  // claims about how the business runs, which no fact we hold can support
  const invented = INVENTED_CLAIM.exec(text) ?? ASK_FOR_PERSON.exec(text)
  if (invented) return { ok: false, error: `"${invented[0]}" describes something we were never told` }

  const allowed = new Set<string>(['ivy', 'cleans', 'i'])
  const allow = (s: string | undefined) => {
    for (const w of words(s ?? '')) allowed.add(w.toLowerCase())
  }
  allow(facts.city)
  allow(facts.state)
  allow(facts.stateName)
  allow(o.crewLead)
  allow(o.insurance)
  for (const name of facts.areaNames) allow(name)
  for (const r of o.reviews ?? []) allow(r.firstName)
  for (const month of MONTHS) allowed.add(month.toLowerCase())
  allow(knownText)

  for (const paragraph of paragraphs) {
    const sentences = paragraph.split(/(?<=[.!?])\s+/)
    for (const sentence of sentences) {
      const tokens = words(sentence)
      for (const [i, token] of tokens.entries()) {
        if (i === 0) continue
        if (!/^[A-Z][a-z'’]+$/.test(token)) continue
        if (!allowed.has(token.toLowerCase())) {
          return { ok: false, error: `"${token}" is not a name we were given` }
        }
      }
    }
  }
  return { ok: true }
}
