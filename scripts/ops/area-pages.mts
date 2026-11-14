#!/usr/bin/env node
/*
 * scripts/ops/area-pages.mts — research and write a city's area pages from a Claude Code session instead of the API.
 * The rules come from the pipeline's own prompts; every save runs the pipeline's own checks. No model calls here.
 *
 *   npx tsx scripts/ops/area-pages.mts list <city>
 *   npx tsx scripts/ops/area-pages.mts research-brief <city> <slug>
 *   npx tsx scripts/ops/area-pages.mts save-research <city> <slug> <file.json>   {subdivisions, housingCharacter, conditions, sources}
 *   npx tsx scripts/ops/area-pages.mts write-brief <city> <slug>
 *   npx tsx scripts/ops/area-pages.mts save-copy <city> <slug> <file.json>       {intro, homes, local, links}
 *   npx tsx scripts/ops/area-pages.mts check <city>
 *
 * Writes content/<city>.json (or the database row, under CONTENT_STORE=db). Run from the repo root.
 */
import fs from 'node:fs'
import { z } from 'zod'

for (const f of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(f)
  } catch {
    // absent — fall through to the next source
  }
}

const { readCityDoc, writeCityDoc, listLiveCityKeys } = await import('../../src/server/content/store')
const { checkQuality } = await import('../../src/server/content/quality')
const { checkCity, findInvisibleChars } = await import('../../src/server/content/similarity')
const { suburbSlots, isWritableArea } = await import('../../src/server/content/slots')
const { acceptLinks, MAX_SUBURB_LINKS } = await import('../../src/server/content/links')
const { ConditionSchema, SuburbCopySchema } = await import('../../src/server/pipeline/schemas')
const { SUBURB_SYSTEM, buildAreaResearchPrompt, buildSuburbPrompt } = await import('../../src/server/pipeline/stages/prompts')

const [cmd, key, slug, file] = process.argv.slice(2)

const ResearchFileSchema = z
  .object({
    subdivisions: z.array(z.string()),
    housingCharacter: z.string(),
    conditions: z.array(ConditionSchema),
    // where each fact came from; printed for review, not stored on the city
    sources: z.array(z.object({ fact: z.string(), url: z.string().url() }).strict()),
  })
  .strict()

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

async function load(cityKey: string | undefined) {
  if (!cityKey) fail('city key missing')
  const doc = await readCityDoc(cityKey)
  if (doc === null) fail(`no city "${cityKey}"`)
  return doc
}

function areaOf(doc: Awaited<ReturnType<typeof load>>, areaSlug: string | undefined) {
  const area = doc.research.suburbs.find((s) => s.slug === areaSlug)
  if (!area) fail(`no area "${areaSlug}" in ${doc.city}; run list for the slugs`)
  return area
}

// the facts a prompt may use: reviews only, since the other About Us values can be demo samples
function factsOf(doc: Awaited<ReturnType<typeof load>>) {
  const { city, state, stateName, phone, phoneDisplay, phoneHref, address } = doc
  return {
    city, state, stateName, phone, phoneDisplay, phoneHref, address,
    ...(doc.ops?.reviews?.length ? { ops: { reviews: doc.ops.reviews } } : {}),
  }
}

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

async function findings(doc: Awaited<ReturnType<typeof load>>, onlySlug?: string) {
  const others = []
  for (const k of await listLiveCityKeys()) {
    if (k === key) continue
    const other = await readCityDoc(k)
    if (other) others.push({ city: other.city, sections: other.sections })
  }
  const prefix = onlySlug ? `suburb.${onlySlug}` : 'suburb.'
  const quality = checkQuality(doc).filter((f) => f.slot.startsWith(prefix))
  const similar = checkCity(doc.city, doc.sections, others).filter((f) => f.slot.startsWith(prefix))
  const invisible = findInvisibleChars(doc.sections).filter((f) => f.slot.startsWith(prefix))
  return { quality, similar, invisible }
}

switch (cmd) {
  case 'list': {
    const doc = await load(key)
    for (const a of doc.research.suburbs) {
      const written = suburbSlots(a.slug).every((s) => typeof doc.sections[s] === 'string')
      console.log(`${written ? 'written ' : 'template'}  ${a.slug.padEnd(40)} ${a.name} (${a.subdivisions.length} subdivisions)`)
    }
    break
  }
  case 'research-brief': {
    const doc = await load(key)
    const area = areaOf(doc, slug)
    console.log(buildAreaResearchPrompt(factsOf(doc), area.name, doc.research.suburbs.map((s) => s.name)))
    console.log(`\nSave as JSON: {"subdivisions": [...], "housingCharacter": "...", "conditions": [{"condition": "...", "implication": "...", "copySafe": true}], "sources": [{"fact": "...", "url": "https://..."}]}`)
    console.log('Every subdivision needs a source. copySafe is false for anything a customer should not read.')
    break
  }
  case 'save-research': {
    const doc = await load(key)
    const area = areaOf(doc, slug)
    if (!file) fail('research file missing')
    const r = ResearchFileSchema.parse(JSON.parse(fs.readFileSync(file, 'utf-8')))
    const unsourced = r.subdivisions.filter((s) => !r.sources.some((src) => src.fact.includes(s)))
    if (unsourced.length) fail(`no source names these subdivisions: ${unsourced.join(', ')}`)
    area.subdivisions = r.subdivisions
    area.housingCharacter = r.housingCharacter
    area.conditions = r.conditions
    // the old copy was written from the old research: clear it so check never pairs the two
    for (const s of suburbSlots(area.slug)) delete doc.sections[s]
    for (const s of suburbSlots(area.slug)) delete doc.links?.[s]
    await writeCityDoc(key!, doc)
    console.log(`${area.name}: ${r.subdivisions.length} subdivisions, ${r.conditions.length} conditions saved`)
    for (const src of r.sources) console.log(`  ${src.fact} — ${src.url}`)
    if (!isWritableArea(area)) console.log('  no subdivisions: this area keeps the template text')
    break
  }
  case 'write-brief': {
    const doc = await load(key)
    const area = areaOf(doc, slug)
    if (!isWritableArea(area)) fail(`${area.name} has no researched subdivisions; it keeps the template text`)
    // a live city's research predates keywords and neighbours; the prompt reads neither for one area
    const suburbs = doc.research.suburbs.map((s) => ({ neighbors: [], ...s }))
    const research = { suburbs, conditions: doc.research.conditions, zips: doc.research.zips, keywords: [] }
    console.log(`SYSTEM\n${SUBURB_SYSTEM}\n\nTASK\n${buildSuburbPrompt(factsOf(doc), research, { neighbors: [], ...area })}`)
    console.log('\nSave as JSON: {"intro": "...", "homes": "...", "local": "...", "links": [{"slot": "homes", "anchor": "...", "service": "deep-cleaning"}]}')
    break
  }
  case 'save-copy': {
    const doc = await load(key)
    const area = areaOf(doc, slug)
    if (!file) fail('copy file missing')
    const out = SuburbCopySchema.parse(JSON.parse(fs.readFileSync(file, 'utf-8')))
    const problems: string[] = []
    const ranges = { intro: [60, 90], homes: [90, 130], local: [90, 130] } as const
    for (const part of ['intro', 'homes', 'local'] as const) {
      const n = words(out[part])
      const [lo, hi] = ranges[part]
      if (n < lo - 10 || n > hi + 15) problems.push(`${part} is ${n} words, asked for ${lo}–${hi}`)
      if (/[A-Za-z]'[A-Za-z]/.test(out[part])) problems.push(`${part} uses a straight apostrophe; use ’`)
    }
    const [introSlot, homesSlot, localSlot] = suburbSlots(area.slug)
    doc.sections[introSlot] = out.intro
    doc.sections[homesSlot] = out.homes
    doc.sections[localSlot] = out.local
    for (const s of [introSlot, homesSlot, localSlot]) delete doc.links?.[s]
    const slotOf = { intro: introSlot, homes: homesSlot, local: localSlot } as const
    const accepted = acceptLinks(
      out.links.map((l) => ({ slot: slotOf[l.slot], anchor: l.anchor, href: `/services/${l.service}` })),
      { [introSlot]: out.intro, [homesSlot]: out.homes, [localSlot]: out.local },
      MAX_SUBURB_LINKS,
    )
    if (Object.keys(accepted).length > 0) doc.links = { ...(doc.links ?? {}), ...accepted }

    const { quality, similar, invisible } = await findings(doc, area.slug)
    for (const f of quality.filter((f) => f.blocking)) problems.push(`${f.rule}: ${f.detail}`)
    for (const f of similar) problems.push(`similar: ${f.slot} — ${f.detail}`)
    for (const f of invisible) problems.push(`invisible characters in ${f.slot}`)
    if (problems.length) {
      fail(`${area.name} NOT saved:\n  ${problems.join('\n  ')}`)
    }
    await writeCityDoc(key!, doc)
    console.log(`${area.name} saved (${words(out.intro)} / ${words(out.homes)} / ${words(out.local)} words, ${Object.keys(accepted).length} links)`)
    for (const f of quality.filter((f) => !f.blocking)) console.log(`  warning — ${f.rule}: ${f.detail}`)
    break
  }
  case 'check': {
    const doc = await load(key)
    const { quality, similar, invisible } = await findings(doc)
    for (const f of quality) console.log(`${f.blocking ? 'BLOCKING' : 'warning '} ${f.rule}: ${f.detail}`)
    for (const f of similar) console.log(`similar  ${f.slot} — ${f.detail}`)
    for (const f of invisible) console.log(`invisible characters in ${f.slot}`)
    if (!quality.length && !similar.length && !invisible.length) console.log('no findings')
    break
  }
  default:
    fail('usage: area-pages.mts list|research-brief|save-research|write-brief|save-copy|check <city> [slug] [file]')
}
process.exit(0)
