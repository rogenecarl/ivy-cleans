// scripts/snapshot-pages.mjs
// Usage: node scripts/snapshot-pages.mjs baseline|compare
// Builds nothing itself — expects the prod server already running on PORT.
// Crawls same-origin links from "/", saves normalized HTML per route,
// and in compare mode diffs against the baseline dir.
import fs from 'node:fs'
import path from 'node:path'

const MODE = process.argv[2]
if (!['baseline', 'compare'].includes(MODE)) {
  console.error('usage: node scripts/snapshot-pages.mjs baseline|compare')
  process.exit(2)
}
const BASE = process.env.SNAPSHOT_ORIGIN ?? 'http://localhost:3100'
const OUT = path.join('scripts', '.snapshots', MODE === 'baseline' ? 'baseline' : 'current')
const BASELINE = path.join('scripts', '.snapshots', 'baseline')

function normalize(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')          // build-dependent payloads
    .replace(/\/_next\/static\/[^"'\s)]+/g, '/_next/static/X')  // hashed asset paths
    .replace(/\snonce="[^"]*"/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function routeToFile(route) {
  return (route === '/' ? 'index' : route.replace(/^\//, '').replace(/\//g, '__')) + '.html'
}

const seen = new Set()
const queue = ['/']
const results = new Map()

while (queue.length > 0) {
  const route = queue.shift()
  if (seen.has(route)) continue
  seen.add(route)
  const res = await fetch(BASE + route, { redirect: 'manual' })
  if (res.status !== 200) {
    console.log(`skip ${route} (${res.status})`)
    continue
  }
  const html = await res.text()
  results.set(route, normalize(html))
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = m[1]
    if (href.startsWith('/_next') || href.startsWith('/images') || href.startsWith('/icons')) continue
    if (/\.(css|js|svg|png|jpg|ico|txt|xml)$/.test(href)) continue
    if (!seen.has(href)) queue.push(href)
  }
}

fs.mkdirSync(OUT, { recursive: true })
let failed = 0
for (const [route, html] of results) {
  const file = path.join(OUT, routeToFile(route))
  fs.writeFileSync(file, html)
  if (MODE === 'compare') {
    const baseFile = path.join(BASELINE, routeToFile(route))
    if (!fs.existsSync(baseFile)) {
      console.error(`NEW ROUTE (no baseline): ${route}`)
      failed++
      continue
    }
    const before = fs.readFileSync(baseFile, 'utf8')
    if (before !== html) {
      console.error(`DIFF: ${route}`)
      const a = before.split('>')
      const b = html.split('>')
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) {
          console.error(`  first divergence at chunk ${i}:`)
          console.error(`  - ${(a[i] ?? '<missing>').slice(0, 200)}`)
          console.error(`  + ${(b[i] ?? '<missing>').slice(0, 200)}`)
          break
        }
      }
      failed++
    }
  }
}
if (MODE === 'compare') {
  const baselineFiles = fs.readdirSync(BASELINE)
  for (const f of baselineFiles) {
    if (!fs.existsSync(path.join(OUT, f))) {
      console.error(`MISSING ROUTE (was in baseline): ${f}`)
      failed++
    }
  }
  console.log(failed === 0 ? `EQUIVALENT (${results.size} routes)` : `${failed} route(s) differ`)
  process.exit(failed === 0 ? 0 : 1)
}
console.log(`baseline captured: ${results.size} routes`)
