#!/usr/bin/env node
/*
 * scripts/generate-city.mjs
 *
 * Drive one city through the full pipeline against the REAL model, printing
 * per-stage progress and the token/cost tally as it goes.
 *
 *   npx tsx scripts/generate-city.mjs houston
 *   npx tsx scripts/generate-city.mjs houston --stage service   # just one stage
 *   npx tsx scripts/generate-city.mjs houston --stage service --regenerate
 *   npx tsx scripts/generate-city.mjs houston --dry-run         # plan only, no spend
 *
 * This exists because the admin UI drives generation from a browser, and the
 * decisive test for this whole project -- generate a city, then read two of
 * its area pages side by side -- needs to be runnable from a terminal.
 *
 * EVERY RUN SPENDS REAL MONEY. Budget $1.50-2.00 per city on claude-opus-5
 * ($5/MTok in, $25/MTok out): a measured Houston run came to $1.18 before the
 * service stage existed, and that stage adds six more calls. Research alone is
 * ~106K input tokens, because web search pulls page content into context.
 * The tally at the end is measured, not estimated.
 *
 * This script runs each stage in ONE call, including the two that make a call
 * per item. That is fine here and NOT fine in the admin: a serverless function
 * is killed long before six-to-twelve sequential model calls finish, which is
 * why the console drives those two stages one item per request.
 */
// Same layering the test setup uses: .env.local wins, .env fills the gaps.
// loadEnvFile throws on a missing file, and either may legitimately be absent.
for (const f of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(f)
  } catch {
    // absent — fall through to the next source
  }
}

const KEY = process.argv[2]
const DRY = process.argv.includes('--dry-run')

/*
 * --stage <id> runs exactly one stage and NEVER regenerates.
 *
 * Without it, a city whose research has already run is re-researched (see the
 * loop below), which clears front/deep/suburb/service and pays for the whole
 * pipeline again. That is the right default for "generate this city", and the
 * wrong thing entirely when a new stage has been added and every other stage's
 * output is still good.
 */
const stageFlag = process.argv.indexOf('--stage')
const ONLY_STAGE = stageFlag === -1 ? null : process.argv[stageFlag + 1]

/*
 * --regenerate clears the named stage's slots before re-running, instead of
 * skipping the ones already written. Needed after a PROMPT change: the stage
 * itself is resumable by design and will happily skip every slot it already
 * filled, which is right for a retry and wrong for a rewrite.
 */
const REGENERATE = process.argv.includes('--regenerate')

if (!KEY) {
  console.error('usage: node scripts/generate-city.mjs <city-key> [--stage <id>] [--dry-run]')
  process.exit(1)
}
if (stageFlag !== -1 && !ONLY_STAGE) {
  console.error('--stage needs a stage id, e.g. --stage service')
  process.exit(1)
}
if (REGENERATE && ONLY_STAGE === null) {
  // Guard, not a limitation: `--regenerate` with no stage would clear and
  // rebuild the whole city, which is what running with no flags already does.
  console.error('--regenerate needs --stage, e.g. --stage service --regenerate')
  process.exit(1)
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not found in .env.local, .env, or the environment')
  process.exit(1)
}

// Run this file with tsx (see the usage line above) so the .ts imports below
// resolve. Imported dynamically, after the env load, so makeClient() sees the key.
const { loadDraft } = await import('../src/content/drafts.ts')
const { runStage, regenerateStage, STAGES } = await import('../src/pipeline/stages.ts')
const { makeClient } = await import('../src/pipeline/model.ts')

const IN_PER_MTOK = 5
const OUT_PER_MTOK = 25

const draft = await loadDraft(KEY)

const plan = ONLY_STAGE === null ? STAGES : STAGES.filter((s) => s.id === ONLY_STAGE)
if (plan.length === 0) {
  console.error(`unknown stage "${ONLY_STAGE}" — expected one of ${STAGES.map((s) => s.id).join(', ')}`)
  process.exit(1)
}

console.log(`city   : ${draft.facts.city}, ${draft.facts.state}`)
console.log(`stages : ${STAGES.map((s) => s.id).join(' → ')}`)
console.log(`done   : ${draft.done.length ? draft.done.join(', ') : '(nothing yet)'}`)
const mode = ONLY_STAGE === null ? '' : REGENERATE ? '  (clearing first)' : '  (no regenerate)'
console.log(`running: ${plan.map((s) => s.id).join(', ')}${mode}`)

if (DRY) {
  console.log('\n--dry-run: auth and plan verified, no calls made.')
  process.exit(0)
}

const client = makeClient()

const started = Date.now()
for (const stage of plan) {
  console.log(`\n▶ ${stage.id} — ${stage.label}`)
  const before = Date.now()
  // research is regenerated deliberately: an existing draft's research may
  // predate the current brief, and everything downstream is built on it.
  // Suppressed under --stage, which is for topping up one stage without
  // paying to rebuild the ones that are already good.
  if (REGENERATE) {
    await regenerateStage(client, KEY, stage.id)
  } else if (ONLY_STAGE === null && stage.id === 'research' && draft.done.includes('research')) {
    await regenerateStage(client, KEY, 'research')
  } else {
    await runStage(client, KEY, stage.id)
  }
  const u = client.usage
  console.log(
    `  ✓ ${((Date.now() - before) / 1000).toFixed(1)}s · ${u.calls} calls so far · ` +
      `${u.inputTokens.toLocaleString()} in / ${u.outputTokens.toLocaleString()} out`
  )
}

const { calls, inputTokens, outputTokens } = client.usage
const cost = (inputTokens / 1e6) * IN_PER_MTOK + (outputTokens / 1e6) * OUT_PER_MTOK
console.log(`\n${'─'.repeat(52)}`)
console.log(`calls  : ${calls}`)
console.log(`tokens : ${inputTokens.toLocaleString()} in · ${outputTokens.toLocaleString()} out`)
console.log(`cost   : $${cost.toFixed(2)}   (measured, claude-opus-5)`)
console.log(`elapsed: ${((Date.now() - started) / 1000 / 60).toFixed(1)} min`)
