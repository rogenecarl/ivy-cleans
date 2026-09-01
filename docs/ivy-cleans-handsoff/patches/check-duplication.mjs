#!/usr/bin/env node
/*
 * scripts/check-duplication.mjs
 *
 * Runs the similarity checks over every published city in content/*.json and
 * prints what collides. Same logic as src/content/similarity.ts, standalone so
 * it can be run today against what has already shipped:
 *
 *   node scripts/check-duplication.mjs
 *   node scripts/check-duplication.mjs --run 40    # stricter verbatim floor
 *
 * Exits 1 if anything is found, so it can sit in CI later.
 */
import { readFile, readdir } from 'fs/promises'
import path from 'path'

const CONTENT = path.join(process.cwd(), 'content')
const MAX_RUN = Number(process.argv.includes('--run') ? process.argv[process.argv.indexOf('--run') + 1] : 60)
const MAX_CROSS = 0.8
const MAX_SIBLING = 0.75
const EXEMPT_HERO_INDICES = new Set([3, 4])

const normalize = (t) =>
  t.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()

function windows(text, len) {
  const out = new Set()
  for (let i = 0; i + len <= text.length; i++) out.add(text.slice(i, i + len))
  return out
}

function sharesRunOfLength(a, b, len) {
  if (len <= 0 || a.length < len || b.length < len) return false
  const seen = windows(a, len)
  for (let i = 0; i + len <= b.length; i++) if (seen.has(b.slice(i, i + len))) return true
  return false
}

function longestSharedRun(rawA, rawB) {
  const a = normalize(rawA)
  const b = normalize(rawB)
  let lo = 0
  let hi = Math.min(a.length, b.length)
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    if (sharesRunOfLength(a, b, mid)) lo = mid
    else hi = mid - 1
  }
  if (lo === 0) return ''
  const seen = windows(a, lo)
  for (let i = 0; i + lo <= b.length; i++) {
    const s = b.slice(i, i + lo)
    if (seen.has(s)) return s
  }
  return ''
}

function shingles(text, k = 5) {
  const words = normalize(text).split(' ').filter(Boolean)
  const out = new Set()
  for (let i = 0; i + k <= words.length; i++) out.add(words.slice(i, i + k).join(' '))
  return out
}

function shingleSimilarity(a, b) {
  const sa = shingles(a)
  const sb = shingles(b)
  if (!sa.size || !sb.size) return 0
  let shared = 0
  for (const s of sa) if (sb.has(s)) shared++
  return shared / (sa.size + sb.size - shared)
}

function flatten(sections) {
  const out = []
  for (const [slot, value] of Object.entries(sections)) {
    if (Array.isArray(value)) {
      value.forEach((text, i) => {
        if (slot === 'services.heroParagraphs' && EXEMPT_HERO_INDICES.has(i)) return
        out.push([`${slot}[${i}]`, text])
      })
    } else out.push([slot, value])
  }
  return out
}

const files = (await readdir(CONTENT)).filter((f) => f.endsWith('.json') && !f.startsWith('_'))
const cities = []
for (const f of files) {
  const doc = JSON.parse(await readFile(path.join(CONTENT, f), 'utf-8'))
  if (doc.sections) cities.push({ city: doc.city ?? f.replace('.json', ''), sections: doc.sections })
}

console.log(`Checking ${cities.length} cities: ${cities.map((c) => c.city).join(', ')}`)
console.log(`Verbatim floor: ${MAX_RUN} chars · cross-city: ${MAX_CROSS} · sibling: ${MAX_SIBLING}\n`)

let findings = 0

for (let i = 0; i < cities.length; i++) {
  for (let j = i + 1; j < cities.length; j++) {
    const A = cities[i]
    const B = cities[j]
    const fa = flatten(A.sections)
    const fb = flatten(B.sections)
    for (const [slotA, textA] of fa) {
      for (const [slotB, textB] of fb) {
        const run = longestSharedRun(textA, textB)
        if (run.length >= MAX_RUN) {
          findings++
          console.log(`VERBATIM  ${A.city} ${slotA}  ↔  ${B.city} ${slotB}`)
          console.log(`          ${run.length} chars: "${run.slice(0, 90)}${run.length > 90 ? '…' : ''}"\n`)
          continue
        }
        if (slotA === slotB) {
          const sim = shingleSimilarity(textA, textB)
          if (sim > MAX_CROSS) {
            findings++
            console.log(`SIMILAR   ${A.city} ${slotA}  ↔  ${B.city} ${slotB}  ${(sim * 100).toFixed(0)}%\n`)
          }
        }
      }
    }
  }
}

for (const c of cities) {
  const subs = flatten(c.sections).filter(([s]) => s.startsWith('suburb.'))
  for (let i = 0; i < subs.length; i++) {
    for (let j = i + 1; j < subs.length; j++) {
      if (subs[i][0].split('.').pop() !== subs[j][0].split('.').pop()) continue
      const sim = shingleSimilarity(subs[i][1], subs[j][1])
      if (sim > MAX_SIBLING) {
        findings++
        console.log(`SIBLING   ${c.city}: ${subs[i][0]} ↔ ${subs[j][0]}  ${(sim * 100).toFixed(0)}%\n`)
      }
    }
  }
}

console.log(findings === 0 ? '✓ no duplication found' : `✗ ${findings} finding(s)`)
process.exit(findings === 0 ? 0 : 1)
