#!/usr/bin/env node
// Source: US Census Bureau, 2020 Gazetteer ZCTA file (public domain) — centroid per ZIP; state from the USPS 3-digit prefix.
// Writes src/server/pipeline/data/zips.json: { "55401": [lat, lon, "MN"], ... }. Run: node scripts/dev/build-zip-table.mjs
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const URL = 'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2020_Gazetteer/2020_Gaz_zcta_national.zip'
const ROOT = path.resolve(import.meta.dirname, '..', '..')
const OUT = path.join(ROOT, 'src/server/pipeline/data/zips.json')

// USPS 3-digit prefix ranges -> state
const RANGES = [
  [5, 5, 'NY'], [6, 9, 'PR'], [10, 27, 'MA'], [28, 29, 'RI'], [30, 38, 'NH'], [39, 49, 'ME'], [50, 54, 'VT'],
  [55, 55, 'MA'], [56, 59, 'VT'], [60, 69, 'CT'], [70, 89, 'NJ'], [100, 149, 'NY'], [150, 196, 'PA'],
  [197, 199, 'DE'], [200, 200, 'DC'], [201, 201, 'VA'], [202, 205, 'DC'], [206, 219, 'MD'], [220, 246, 'VA'],
  [247, 268, 'WV'], [270, 289, 'NC'], [290, 299, 'SC'], [300, 319, 'GA'], [320, 349, 'FL'], [350, 369, 'AL'],
  [370, 385, 'TN'], [386, 397, 'MS'], [398, 399, 'GA'], [400, 427, 'KY'], [430, 459, 'OH'], [460, 479, 'IN'],
  [480, 499, 'MI'], [500, 528, 'IA'], [530, 549, 'WI'], [550, 567, 'MN'], [569, 569, 'DC'], [570, 577, 'SD'],
  [580, 588, 'ND'], [590, 599, 'MT'], [600, 629, 'IL'], [630, 658, 'MO'], [660, 679, 'KS'], [680, 693, 'NE'],
  [700, 714, 'LA'], [716, 729, 'AR'], [730, 732, 'OK'], [733, 733, 'TX'], [734, 749, 'OK'], [750, 799, 'TX'],
  [800, 816, 'CO'], [820, 831, 'WY'], [832, 838, 'ID'], [840, 847, 'UT'], [850, 865, 'AZ'], [870, 884, 'NM'],
  [885, 885, 'TX'], [889, 898, 'NV'], [900, 961, 'CA'], [967, 968, 'HI'], [969, 969, 'GU'], [970, 979, 'OR'],
  [980, 994, 'WA'], [995, 999, 'AK'],
]

function stateFor(zip) {
  const p = Number(zip.slice(0, 3))
  return RANGES.find(([lo, hi]) => p >= lo && p <= hi)?.[2] ?? null
}

const dir = mkdtempSync(path.join(tmpdir(), 'zcta-'))
const zipPath = path.join(dir, 'zcta.zip')
const res = await fetch(URL)
if (!res.ok) throw new Error(`download failed: ${res.status}`)
writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()))
const text = execFileSync('unzip', ['-p', zipPath], { maxBuffer: 64 * 1024 * 1024 }).toString('utf-8')

const lines = text.trim().split(/\r?\n/)
const header = lines[0].split('\t').map((h) => h.trim())
const col = (name) => header.indexOf(name)
const [iZip, iLat, iLon] = [col('GEOID'), col('INTPTLAT'), col('INTPTLONG')]
const table = {}
for (const line of lines.slice(1)) {
  const f = line.split('\t').map((v) => v.trim())
  const state = stateFor(f[iZip])
  if (!state) continue
  table[f[iZip]] = [Number(Number(f[iLat]).toFixed(3)), Number(Number(f[iLon]).toFixed(3)), state]
}
mkdirSync(path.dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(table))
console.log(`wrote ${Object.keys(table).length} ZIPs to ${path.relative(ROOT, OUT)}`)
