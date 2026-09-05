#!/usr/bin/env node
/*
 * evals/run.mjs — measure a prompt change instead of guessing at it.
 *
 *   npx tsx evals/run.mjs                 every fixture
 *   npx tsx evals/run.mjs houston-tx      one
 *   npx tsx evals/run.mjs --dry-run       plan and cost, no spend
 *   npx tsx evals/run.mjs --no-rubric     mechanical checks only
 *
 * SPENDS REAL MONEY — about $1.50 for all three fixtures. Research is frozen
 * into the fixtures rather than re-run; evals/README.md says why.
 *
 * Exits 1 on any failed check, so this can gate a merge.
 *
 * WRITES INTO content/. Every fixture runs as a `zeval-<name>` draft and is
 * deleted afterwards, and content/_cities.json is restored byte-for-byte —
 * the same contract tests/admin-logic.test.ts holds itself to. A crash
 * mid-run leaves sidecars behind; they are all prefixed `zeval-`.
 */
for (const f of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(f)
  } catch {
    // absent — fall through
  }
}

import { readFile, writeFile, readdir, rm, mkdir } from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const FIXTURES = path.join(ROOT, 'evals/fixtures')
const RESULTS = path.join(ROOT, 'evals/results')
const CONTENT = path.join(ROOT, 'content')
const CITIES_JSON = path.join(CONTENT, '_cities.json')

const args = process.argv.slice(2)
const DRY = args.includes('--dry-run')
const NO_RUBRIC = args.includes('--no-rubric')
const only = args.filter((a) => !a.startsWith('--'))

if (!DRY && !process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not found in .env.local, .env, or the environment')
  process.exit(1)
}

// Imported after the env load so makeClient() sees the key.
const { createDraft, loadDraft, saveDraft, deleteDraft } = await import('../src/content/drafts.ts')
const { runStage, STAGES } = await import('../src/pipeline/stages.ts')
const { makeClient } = await import('../src/pipeline/model.ts')
const { checkQuality } = await import('../src/content/quality.ts')
const { shingleSimilarity, longestSharedRun } = await import('../src/content/similarity.ts')
const { isWritableArea, suburbSlots } = await import('../src/content/slots.ts')

const IN_PER_MTOK = 5
const OUT_PER_MTOK = 25
const SIBLING_MAX = 0.75
const VERBATIM_FLOOR = 60
const RUBRIC_MIN = 4

/* ────────────────────────────────────────────────────────────────────────────
 * The rubric — the only check here that a mechanical rule cannot make
 * ──────────────────────────────────────────────────────────────────────────── */

/*
 * Why this exists at all: the service-page convergence that had to be caught
 * by reading passed every mechanical check in this file. Four of six pages
 * worked through the same four facts in the same order — entity coverage
 * fine, no banned phrases, similarity 0.054 against a 0.75 threshold. The
 * defect was substance, and only a reader saw it.
 *
 * Deliberately NOT given the research. A resident does not know what the
 * pipeline was told; they know their own neighbourhood. Handing the grader
 * the source material invites it to score "did this use its inputs", which is
 * the question quality.ts already answers.
 */
const RUBRIC_SYSTEM = `You are grading local-business web copy on ONE question, as a resident of the place it describes would.

Would somebody who actually lives in this area recognise their own neighbourhood in it?

  5  Specific and true to this place. Names real developments, describes housing and conditions a resident would confirm, and could not be moved to a neighbouring area without becoming wrong.
  4  Mostly specific. A resident would recognise it, though a sentence or two would sit equally well elsewhere.
  3  Generic with local decoration. Place names dropped into copy that would otherwise fit any suburb in the country.
  2  Could describe anywhere. Nothing checkable.
  1  Wrong or invented — claims a resident would say are untrue of the place.

Judge only what is on the page. Do not reward length, enthusiasm or polish. A short honest paragraph outranks three padded ones.`

async function gradeArea(client, city, areaName, text) {
  const { z } = await import('zod')
  const schema = z
    .object({
      score: z.number().int(),
      reason: z.string(),
    })
    .strict()

  return client.generate({
    schema,
    key: `rubric.${city}.${areaName}`,
    system: RUBRIC_SYSTEM,
    prompt: `Area: ${areaName}, in the ${city} metro.\n\nThe page:\n\n${text}\n\nScore it 1-5 on the single question above, and give one sentence saying why. If the score is under 4, name the specific sentence that would sit equally well on another area's page.`,
  })
}

/* ────────────────────────────────────────────────────────────────────────────
 * Harness
 * ──────────────────────────────────────────────────────────────────────────── */

async function fixtureNames() {
  const all = (await readdir(FIXTURES, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
  return only.length ? all.filter((n) => only.includes(n)) : all
}

/** Fixture facts + frozen research -> a draft the writing stages can run on. */
async function seedDraft(name) {
  const facts = JSON.parse(await readFile(path.join(FIXTURES, name, 'facts.json'), 'utf-8'))
  const research = JSON.parse(await readFile(path.join(FIXTURES, name, 'research.json'), 'utf-8'))

  // createDraft derives the key from the city name, so the fixture city is
  // renamed to a zeval- one. That is also what keeps a fixture from ever
  // colliding with the real city its research came from.
  const key = `zeval-${name}`
  await rm(path.join(CONTENT, '_drafts', `${key}.json`), { force: true })
  const created = await createDraft({ ...facts, city: `Zeval ${name}` })
  if (created !== key) {
    // createDraft slugifies the city name; if that ever stops matching, fail
    // loudly rather than leaving a stray draft behind under another key.
    await deleteDraft(created)
    throw new Error(`expected draft key "${key}", got "${created}" — fixture naming and draftKeyFor have drifted`)
  }

  const draft = await loadDraft(key)
  // The real city name is restored on the facts: the prompts write about the
  // place the research describes, not about "Zeval houston-tx".
  draft.facts = { ...draft.facts, city: facts.city, state: facts.state, stateName: facts.stateName }
  if (facts.ops) draft.facts.ops = facts.ops
  draft.research = research
  draft.done = ['research']
  await saveDraft(key, draft)
  return { key, facts, research }
}

const WRITING_STAGES = STAGES.filter((s) => s.id !== 'research').map((s) => s.id)

async function runFixture(client, name) {
  const { key, facts, research } = await seedDraft(name)
  const started = Date.now()

  for (const stage of WRITING_STAGES) {
    await runStage(client, key, stage)
  }

  const draft = await loadDraft(key)
  const built = research.suburbs.filter(isWritableArea)

  // checkQuality reads a CityContent; assemble the shape it needs rather than
  // finalizing, which would register the key in _cities.json.
  const doc = {
    ...draft.facts,
    address: '—',
    status: 'draft',
    hasSuburbPages: true,
    maps: { front: null, home: null, contact: null },
    research: { ...research, mapEmbedUrl: null },
    sections: draft.sections,
    ...(draft.facts.ops ? { ops: draft.facts.ops } : {}),
  }

  return {
    name,
    key,
    city: facts.city,
    elapsedMs: Date.now() - started,
    areasResearched: research.suburbs.length,
    areasBuilt: built.length,
    built,
    sections: draft.sections,
    quality: checkQuality(doc),
  }
}

/** Every pair of same-kind slots within one city. */
function siblingPairs(result) {
  const out = []
  for (const kind of ['intro', 'homes', 'local']) {
    const slots = result.built.map((s) => ({ slug: s.slug, text: result.sections[`suburb.${s.slug}.${kind}`] }))
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (typeof slots[i].text !== 'string' || typeof slots[j].text !== 'string') continue
        out.push({
          kind,
          pair: `${slots[i].slug} ↔ ${slots[j].slug}`,
          score: shingleSimilarity(slots[i].text, slots[j].text),
        })
      }
    }
  }
  return out
}

function flatten(sections) {
  return Object.entries(sections).map(([slot, v]) => ({ slot, text: Array.isArray(v) ? v.join(' ') : v }))
}

/* ────────────────────────────────────────────────────────────────────────────
 * Run
 * ──────────────────────────────────────────────────────────────────────────── */

const names = await fixtureNames()
if (names.length === 0) {
  console.error(`no fixtures matched${only.length ? ` ${only.join(', ')}` : ''}`)
  process.exit(1)
}

console.log(`fixtures : ${names.join(', ')}`)
console.log(`stages   : ${WRITING_STAGES.join(' → ')}   (research frozen — see evals/README.md)`)
console.log(`rubric   : ${NO_RUBRIC ? 'skipped' : 'on'}`)

if (DRY) {
  for (const name of names) {
    const research = JSON.parse(await readFile(path.join(FIXTURES, name, 'research.json'), 'utf-8'))
    const built = research.suburbs.filter(isWritableArea).length
    console.log(`  ${name}: ${research.suburbs.length} areas researched, ${built} would build`)
  }
  console.log('\n--dry-run: nothing generated, nothing spent.')
  process.exit(0)
}

const citiesBefore = await readFile(CITIES_JSON, 'utf-8')
const client = makeClient()
const failures = []
const results = []

try {
  for (const name of names) {
    process.stdout.write(`\n▶ ${name} `)
    const r = await runFixture(client, name)
    process.stdout.write(`${(r.elapsedMs / 1000).toFixed(0)}s\n`)

    const checks = []
    const push = (label, ok, detail) => {
      checks.push({ label, ok, detail })
      if (!ok) failures.push(`${name}: ${label} — ${detail}`)
      console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  ${detail}` : ''}`)
    }

    push(
      'uniqueness gate',
      true,
      `${r.areasBuilt} of ${r.areasResearched} areas built`,
    )

    const blocking = r.quality.filter((f) => f.blocking)
    push('entity coverage + ops used', blocking.length === 0, blocking.map((f) => `${f.slot}: ${f.detail}`).join('; '))

    const banned = r.quality.filter((f) => f.rule === 'banned-phrase')
    push('banned phrases', banned.length === 0, banned.map((f) => `${f.slot} ${f.detail}`).join('; '))

    const siblings = siblingPairs(r)
    const worst = siblings.reduce((a, b) => (b.score > a.score ? b : a), { score: 0, pair: '—', kind: '' })
    push(
      'sibling similarity',
      siblings.every((p) => p.score < SIBLING_MAX),
      `worst ${worst.score.toFixed(3)} (${worst.pair} ${worst.kind})`,
    )

    let rubric = []
    if (!NO_RUBRIC && r.areasBuilt > 0) {
      for (const area of r.built) {
        const text = suburbSlots(area.slug)
          .map((slot) => r.sections[slot])
          .filter((t) => typeof t === 'string')
          .join('\n\n')
        if (text.trim() === '') continue
        const graded = await gradeArea(client, r.city, area.name, text)
        rubric.push({ area: area.name, ...graded })
      }
      const low = rubric.filter((g) => g.score < RUBRIC_MIN)
      const mean = rubric.length ? rubric.reduce((s, g) => s + g.score, 0) / rubric.length : 0
      push(
        'rubric — would a resident recognise it',
        low.length === 0,
        `mean ${mean.toFixed(1)}${low.length ? ` · under ${RUBRIC_MIN}: ${low.map((g) => `${g.area} (${g.score})`).join(', ')}` : ''}`,
      )
      for (const g of rubric) console.log(`      ${g.score}  ${g.area} — ${g.reason}`)
    }

    results.push({ ...r, built: r.built.map((s) => s.slug), siblings, rubric, checks })
  }

  /*
   * Cross-fixture: the check that catches a prompt producing one house style
   * that every city then wears. Only same-kind slots are compared — a Katy
   * `homes` paragraph is only meaningfully comparable to another city's
   * `homes`.
   *
   * Fixtures of the SAME CITY are skipped. houston-ops is houston-tx's
   * research with an ops block bolted on, so the two are one city generated
   * twice; flagging them as duplicates of each other measures nothing about
   * the prompt and buries the findings that do matter. Found by the harness's
   * own first real run, which reported `suburb.pearland.local` shared between
   * them as though it were a defect.
   */
  console.log('\n▶ across fixtures')
  const crossFindings = []
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      if (results[i].city === results[j].city) continue
      const a = flatten(results[i].sections)
      const b = flatten(results[j].sections)
      for (const x of a) {
        for (const y of b) {
          if (x.slot !== y.slot) continue
          const run = longestSharedRun(x.text, y.text)
          if (run && run.length >= VERBATIM_FLOOR) {
            crossFindings.push(`${results[i].name} ↔ ${results[j].name} ${x.slot}: ${run.length} chars`)
          }
        }
      }
    }
  }
  const ok = crossFindings.length === 0
  console.log(`  ${ok ? '✓' : '✗'} no shared run of ${VERBATIM_FLOOR}+ chars${ok ? '' : `\n      ${crossFindings.join('\n      ')}`}`)
  if (!ok) failures.push(`cross-fixture: ${crossFindings.length} verbatim finding(s)`)

  const { calls, inputTokens, outputTokens } = client.usage
  const cost = (inputTokens / 1e6) * IN_PER_MTOK + (outputTokens / 1e6) * OUT_PER_MTOK

  await mkdir(RESULTS, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outPath = path.join(RESULTS, `${stamp}.json`)
  await writeFile(
    outPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        rubric: !NO_RUBRIC,
        usage: { calls, inputTokens, outputTokens, costUsd: Number(cost.toFixed(2)) },
        crossFindings,
        fixtures: results.map(({ sections, ...rest }) => rest),
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  )

  console.log(`\n${'─'.repeat(56)}`)
  console.log(`calls  : ${calls}`)
  console.log(`cost   : $${cost.toFixed(2)}   (measured, claude-opus-5)`)
  console.log(`results: ${path.relative(ROOT, outPath)}`)
  console.log(failures.length ? `\n✗ ${failures.length} failed check(s)\n  ${failures.join('\n  ')}\n` : '\n✓ all checks passed\n')
} finally {
  // Always: the fixtures must not survive the run, and _cities.json is
  // statically inlined into the proxy bundle, so it comes back byte-identical.
  for (const name of names) await deleteDraft(`zeval-${name}`).catch(() => {})
  for (const name of names) await rm(path.join(CONTENT, `zeval-${name}.json`), { force: true })
  await writeFile(CITIES_JSON, citiesBefore, 'utf-8')
}

process.exit(failures.length ? 1 : 0)
