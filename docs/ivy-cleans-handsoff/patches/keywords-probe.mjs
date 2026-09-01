#!/usr/bin/env node
/*
 * scripts/keywords-probe.mjs
 *
 * Verifies DataForSEO credentials and shows what a city actually returns,
 * before any of it is wired into the pipeline. Run this first.
 *
 *   DATAFORSEO_LOGIN=... DATAFORSEO_PASSWORD=... node scripts/keywords-probe.mjs "Katy" TX
 *   node scripts/keywords-probe.mjs "Houston" TX --related
 *
 * Costs a fraction of a cent. Exits 1 on any API or auth failure so a bad
 * credential fails loudly rather than silently producing an empty list.
 */

const [, , cityArg, stateArg, ...flags] = process.argv
const CITY = cityArg ?? 'Houston'
const STATE = stateArg ?? 'TX'
const WITH_RELATED = flags.includes('--related')

const LOGIN = process.env.DATAFORSEO_LOGIN
const PASSWORD = process.env.DATAFORSEO_PASSWORD
const US = 2840

if (!LOGIN || !PASSWORD) {
  console.error('Missing DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD in the environment.')
  console.error('Get them from https://app.dataforseo.com/api-access')
  process.exit(1)
}

const auth = 'Basic ' + Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64')

async function post(path, body) {
  const res = await fetch(`https://api.dataforseo.com/v3${path}`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  const json = await res.json()
  if (json.status_code !== 20000) throw new Error(`${json.status_code} ${json.status_message}`)
  const task = json.tasks?.[0]
  if (!task) throw new Error('no task in response')
  if (task.status_code !== 20000) throw new Error(`task ${task.status_code} ${task.status_message}`)
  return task.result ?? []
}

const c = CITY.toLowerCase()
const st = STATE.toLowerCase()
const services = [
  'house cleaning',
  'cleaning services',
  'maid service',
  'deep cleaning',
  'move out cleaning',
  'apartment cleaning',
  'airbnb cleaning',
  'post construction cleaning',
  'office cleaning',
]

const keywords = [
  ...services.flatMap((s) => [`${s} ${c}`, `${s} ${c} ${st}`]),
  'house cleaning near me',
  'cleaning services near me',
]

console.log(`\nDataForSEO probe — ${CITY}, ${STATE}`)
console.log(`${keywords.length} keywords, national targeting (location_code ${US})\n`)

try {
  const result = await post('/keywords_data/google_ads/search_volume/live', [
    { keywords, location_code: US, language_code: 'en' },
  ])

  const rows = result
    .map((r) => ({
      keyword: r.keyword,
      volume: r.search_volume ?? 0,
      cpc: r.cpc ?? 0,
      comp: r.competition_index ?? 0,
    }))
    .sort((a, b) => b.volume - a.volume)

  const w = Math.max(...rows.map((r) => r.keyword.length), 10)
  console.log(`${'KEYWORD'.padEnd(w)}  ${'VOL'.padStart(7)}  ${'CPC'.padStart(7)}  COMP`)
  console.log('─'.repeat(w + 26))
  for (const r of rows) {
    console.log(
      `${r.keyword.padEnd(w)}  ${String(r.volume).padStart(7)}  ${('$' + r.cpc.toFixed(2)).padStart(7)}  ${r.comp}`
    )
  }

  const withVolume = rows.filter((r) => r.volume > 0).length
  const total = rows.reduce((s, r) => s + r.volume, 0)
  console.log(`\n${withVolume}/${rows.length} terms have measured volume · ${total} searches/mo combined`)

  if (total < 300) {
    console.log(
      '\n⚠ Under the 300/mo demand floor in market-qualification.md.\n' +
      '  Zero-volume geo terms are normal for small places and are kept deliberately,\n' +
      '  but a low combined total is a real signal about the market.'
    )
  }

  if (WITH_RELATED) {
    console.log(`\n─── related keywords for "house cleaning ${c}" ───\n`)
    const rel = await post('/dataforseo_labs/google/related_keywords/live', [
      { keyword: `house cleaning ${c}`, location_code: US, language_code: 'en', depth: 2, limit: 40 },
    ])
    const items = rel[0]?.items ?? []
    const relRows = items
      .map((i) => ({
        keyword: i.keyword_data?.keyword ?? '',
        volume: i.keyword_data?.keyword_info?.search_volume ?? 0,
      }))
      .filter((r) => r.keyword)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 25)
    for (const r of relRows) console.log(`${String(r.volume).padStart(7)}  ${r.keyword}`)
    console.log(`\n${items.length} related terms returned.`)
  }

  console.log('\n✓ credentials work\n')
} catch (err) {
  console.error(`\n✗ ${err.message}\n`)
  process.exit(1)
}
