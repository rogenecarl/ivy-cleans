#!/usr/bin/env node
/*
 * scripts/admin-e2e.mjs — stubbed browser end-to-end run of the admin pipeline.
 *
 * VERIFICATION TOOLING, RUN BY HAND. Not wired into `pnpm test` and not in CI:
 * it needs a running server, a borrowed Playwright, and it writes into the real
 * content/ directory (then puts it back). `pnpm test` stays a pure unit suite.
 *
 * WHAT IT PROVES
 *   The four admin screens work as a chain in a real browser: dashboard →
 *   new-city form → per-stage generation → review (suburb editor, preview) →
 *   publish → dashboard shows LIVE. The unit tests exercise the same logic
 *   (tests/admin-logic.test.ts) but call the functions directly; only this
 *   script proves the server actions, the client runner's effect, the confirm
 *   dialog and the rendered preview actually work end to end.
 *
 *   Plan 5 (suburb pages): finalizeDraft now stamps hasSuburbPages:true on
 *   every new draft, so this run also proves the three fixture suburbs
 *   render as real, /stubville/-prefixed links on the preview front page,
 *   and that one of those suburb pages itself actually serves (200, correct
 *   H1, correctly-prefixed "Other Services" links) — not just that the link
 *   exists.
 *
 *   Task 13 (leads capture and the CRM dashboard): a separate case, gated on
 *   DATABASE_URL, submits the real /minneapolis/contact form in a real
 *   browser, then drives the admin leads list and detail screen to confirm
 *   the row that came out of it, its status transition and its saved note.
 *   This is the ONLY place in the whole plan that exercises the submit ->
 *   store -> dashboard chain end to end; every other leads test either mocks
 *   the store (tests/leads-submit.test.ts) or is itself skipped without a
 *   database (tests/leads-store.test.ts). See that case below for exactly
 *   what it does and does not prove.
 *
 *   The admin/manager RBAC plan: this script now signs in before its first
 *   navigation (the console sits behind a login wall) and, after the admin
 *   case finishes, drives FOUR things no unit test can:
 *     - sign-out (built in Task 9, wired into the identity chip in Task 12,
 *       correct by inspection in two reviews, and never once actually
 *       executed, because both tasks were barred from creating the seeded
 *       account it needs) — click Sign out, land on /admin/login, confirm
 *       /admin/dashboard no longer opens in that browser context;
 *     - the proxy adapter end to end (tests/middleware.test.ts covers
 *       resolveAdminRedirect as a pure function; only a real browser holding
 *       a real cookie proves the redirect actually fires);
 *     - the RBAC split in a fresh context signed in as a manager: no Sites
 *       tab in the nav, and /admin/sites bounces to /admin/dashboard;
 *     - that POST /api/auth/sign-up/email — mounted by better-auth
 *       automatically the moment emailAndPassword is enabled, whether or not
 *       anything in the UI links to it — is actually refused against the
 *       real running server, and that a refused attempt creates no `user`
 *       row. tests/better-auth-api.test.ts asserts the `disableSignUp`
 *       config is set; this is the only thing that proves the config does
 *       anything.
 *   tests/access.test.ts covers the role matrix exhaustively and
 *   tests/auth-guards.test.ts covers that every action calls a guard;
 *   neither one opens a browser.
 *
 * REQUIRED ENV: E2E_EMAIL / E2E_PASSWORD (an admin account) and
 * E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD (a manager account), both seeded
 * with scripts/seed-user.mjs. The script fails fast with a clear message if
 * any of the four is unset, rather than surfacing as an opaque Playwright
 * fill() error partway through the run.
 *
 * REQUIRED SERVER MODE: `next dev`, NOT `next start`.
 *
 *     fuser -k 3100/tcp; STUB_MODEL=1 STUB_EMAIL=1 pnpm dev --port 3100
 *
 *   STUB_EMAIL=1 is required for the Task 13 case specifically: without it, a
 *   real minneapolis SiteSettings.notifyEmails row would make the contact
 *   submission attempt a real Resend send. The vitest suite forces this
 *   centrally (see vitest.config.ts); this script talks to a server running
 *   in a separate process, so it has to be set on that process's own
 *   environment instead.
 *
 *   Two independent reasons, both about the production build, neither about
 *   the env var (STUB_MODEL does reach server actions under `next start` —
 *   it is read at call time by makeClient()):
 *
 *   1. src/content/resolve-rewrite.ts STATICALLY IMPORTS content/_cities.json,
 *      so the proxy's city list is INLINED AT BUILD TIME. A city created after
 *      the build is not in it, so on the default host /stubville is not
 *      recognised as a preview path and gets rewritten to
 *      /minneapolis/stubville → 404. The preview step cannot pass against a
 *      build that predates the city. (In production this is not a bug: a real
 *      publish is followed by a redeploy, which is when the domain gets
 *      attached anyway.)
 *   2. `next start` serves the prerendered city pages; a brand-new city's
 *      pages have to be rendered on demand from a content file that did not
 *      exist at build time.
 *
 *   Dev mode recompiles the proxy and the routes from the files on disk, which
 *   is exactly what a from-scratch city needs.
 *
 * MODEL: the server MUST be started with STUB_MODEL=1 so makeClient() returns
 * StubModelClient (canned Stubville copy from tests/fixtures/stub-pipeline.json).
 * This script never causes a live API call; a server started without the flag
 * would, so the first stage failing with an API-key error is the expected
 * outcome there, not a silent charge.
 *
 * PLAYWRIGHT: borrowed from another project rather than added as a dependency.
 *   PW_PATH=/home/kyousuke/Bajig/Intern-Project/epathways/node_modules/playwright
 *
 * USAGE
 *   node scripts/admin-e2e.mjs [--out DIR] [--base URL] [--keep]
 *     --out   screenshot directory (default: $TMPDIR/ivy-admin-e2e)
 *     --base  server origin (default: http://localhost:3100)
 *     --keep  skip cleanup, leaving the generated Stubville on disk
 *
 * CLEANUP (unless --keep): content/stubville.json and content/_drafts/stubville.json
 * are deleted and content/_cities.json + content/_domains.json are restored
 * BYTE-FOR-BYTE from copies taken before the run — the crawler gate compares
 * exact HTML, so "close enough" is not enough. It runs in a finally block, so a
 * failed assertion still leaves content/ pristine.
 *
 * DATABASE: the Task 13 leads-capture case is gated on DATABASE_URL being set
 * in THIS script's own process (not just the server's) -- it deletes the row
 * it creates directly through Postgres, and needs a real connection to do that.
 * Absent, the case SKIPs loudly (a "SKIP" line, not a "PASS") and every other
 * case still runs. It is not counted in the pass/fail totals either way.
 *
 * Exit code 0 only if every check passed. A skip never causes a nonzero exit
 * by itself, but it does mean the leads chain was NOT verified this run --
 * check the "skipped" line in the summary.
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import { setDefaultAutoSelectFamily } from 'node:net'

// Loads .env.local / .env the way `next dev` does, mirroring
// tests/setup-env.ts's rationale: this script is invoked with plain `node`,
// which does not read either file, so DATABASE_URL would otherwise appear
// absent even on a machine that has it configured for the app itself. Each
// load is its own try/catch so a machine missing one file still runs. Load
// .env.local first: process.loadEnvFile only sets a key that isn't already
// present, so the first file to set a key wins.
try {
  process.loadEnvFile('.env.local')
} catch {
  // No .env.local present.
}
try {
  process.loadEnvFile('.env')
} catch {
  // No .env present.
}

/*
 * Same DB_DISABLE_HAPPY_EYEBALLS flag as src/leads/env.ts (see there for the
 * full explanation), applied here because this script's own process opens a
 * raw `pg` connection below (the Task 13 leads-capture cleanup) and is
 * therefore subject to the same Node Happy Eyeballs behaviour independently
 * of the app's own process. Read AFTER the .env load above, and OFF by
 * default -- same reasoning as store.ts: this is a workaround for a sandbox
 * with no IPv6 route, not something known to be safe to force everywhere.
 */
if (process.env.DB_DISABLE_HAPPY_EYEBALLS === '1') setDefaultAutoSelectFamily(false)

/* ── args ─────────────────────────────────────────────────────────────────── */

function arg(name, fallback) {
  const i = process.argv.indexOf(name)
  return i === -1 ? fallback : process.argv[i + 1]
}
const KEEP = process.argv.includes('--keep')
const BASE = arg('--base', 'http://localhost:3100').replace(/\/$/, '')
const OUT = arg('--out', path.join(os.tmpdir(), 'ivy-admin-e2e'))

/*
 * Sign-in credentials for the two seeded operator accounts this run needs
 * (see signIn() below and the manager case further down). Checked here,
 * before anything is launched, so a missing var fails fast with a clear
 * message instead of surfacing as an opaque Playwright fill(undefined)
 * error deep into the run. Never hardcoded -- create the accounts with
 * scripts/seed-user.mjs.
 */
const E2E_EMAIL = process.env.E2E_EMAIL
const E2E_PASSWORD = process.env.E2E_PASSWORD
const E2E_MANAGER_EMAIL = process.env.E2E_MANAGER_EMAIL
const E2E_MANAGER_PASSWORD = process.env.E2E_MANAGER_PASSWORD
const missingEnv = Object.entries({
  E2E_EMAIL,
  E2E_PASSWORD,
  E2E_MANAGER_EMAIL,
  E2E_MANAGER_PASSWORD,
})
  .filter(([, v]) => !v)
  .map(([k]) => k)
if (missingEnv.length > 0) {
  console.error(`admin-e2e: missing required env var(s): ${missingEnv.join(', ')}.`)
  console.error('Seed both operator accounts first, e.g.:')
  console.error(
    "  SEED_PASSWORD=... node --env-file=.env scripts/seed-user.mjs --email e2e-admin@example.invalid --name 'E2E Admin' --role admin",
  )
  console.error(
    "  SEED_PASSWORD=... node --env-file=.env scripts/seed-user.mjs --email e2e-manager@example.invalid --name 'E2E Manager' --role manager",
  )
  console.error(
    'then re-run with E2E_EMAIL/E2E_PASSWORD/E2E_MANAGER_EMAIL/E2E_MANAGER_PASSWORD set.',
  )
  process.exit(2)
}

const ADMIN = '/admin'
const KEY = 'stubville'
const CITY = 'Stubville'
// The plan's "TS" is deliberately kept as the FIRST submission: it is not a
// real state code, so deriveFacts rejects it and the form's error path gets
// exercised. The real run then uses TX. (content/testville.json's "TS" was
// hand-authored and never went through deriveFacts.)
const BAD_STATE = 'TS'
const STATE = 'TX'
// Formatted on purpose: the digits-only rule lives in createDraftFromFields,
// not in the input, so a formatted number proves the stripping.
const PHONE_TYPED = '(555) 555-0123'
const PHONE_DIGITS = '5555550123'
const PHONE_DISPLAY = '(555) 555-0123'
const NOTES = 'Fixture city. Housing stock is mock bungalows and stub-frame duplexes.'
const SUBURBS = ['North Stubville', 'Mock Hollow', 'Fixture Heights']
// Fixture Heights carries zero subdivisions in the fixture (see
// tests/fixtures/stub-pipeline.json) — scoreSuburbs (src/pipeline/stages.ts)
// treats zero subdivisions as a structural disqualifier regardless of the
// rest of its score, so applyUniquenessGate drops it during the research
// stage, before front/deep/suburb ever see it. Everywhere this script checks
// what actually survives past research — chips, the suburbs editor, the
// preview front page — must expect these two, not all three of SUBURBS.
const KEPT_SUBURBS = ['North Stubville', 'Mock Hollow']
const DROPPED_SUBURB = 'Fixture Heights'
// Plan 5: name+slug pairs, mirroring tests/fixtures/stub-pipeline.json's own
// research.structure.suburbs (the canned data StubModelClient serves) —
// hardcoded here the same way SUBURBS itself is, rather than read from the
// fixture file, so a change to the fixture is a visible diff in both places.
const SUBURBS_STRUCT = [
  { name: 'North Stubville', slug: 'house-cleaning-north-stubville' },
  { name: 'Mock Hollow', slug: 'cleaning-services-mock-hollow' },
  { name: 'Fixture Heights', slug: 'fixture-heights-cleaning-services' },
]

const ROOT = path.resolve(path.join(import.meta.dirname, '..'))
const CONTENT = path.join(ROOT, 'content')
const CITY_DOC = path.join(CONTENT, `${KEY}.json`)
const SIDECAR = path.join(CONTENT, '_drafts', `${KEY}.json`)
const PROGRESS = path.join(CONTENT, '_drafts', `${KEY}.progress.json`)
const CITIES_JSON = path.join(CONTENT, '_cities.json')
const DOMAINS_JSON = path.join(CONTENT, '_domains.json')

/* ── result log ───────────────────────────────────────────────────────────── */

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}
function note(message) {
  console.log(`note  ${message}`)
}
// Distinct from check(): a skip is neither a pass nor a fail. It must never
// be silently indistinguishable from a pass (the whole reason this case is
// gated at all), so it gets its own loud console line and its own bucket in
// the summary, and it never touches `results` / the exit code.
const skipped = []
function skip(name, reason) {
  skipped.push({ name, reason })
  console.log(`SKIP  ${name} — ${reason}`)
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

let shotIndex = 0
async function shot(page, name) {
  shotIndex += 1
  const file = path.join(OUT, `${String(shotIndex).padStart(2, '0')}-${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

/** Whole-page text, whitespace-collapsed, for `contains` assertions. */
async function text(page) {
  const body = await page.textContent('body')
  return (body ?? '').replace(/\s+/g, ' ')
}

async function clickText(page, selector, label) {
  const el = page.locator(selector, { hasText: label }).first()
  await el.click()
}

/*
 * Sign in once; the session cookie then rides on every navigation in this
 * context. Added when the console gained authentication — before that this
 * script went straight to /admin/sites.
 *
 * Needs an operator account to exist. Create one with:
 *   node --env-file=.env scripts/seed-user.mjs \
 *     --email e2e-admin@example.invalid --name 'E2E Admin' --role admin --password "$E2E_PASSWORD"
 */
async function signIn(page, email, password) {
  await page.goto(`${BASE}${ADMIN}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await Promise.all([
    page.waitForURL(`${BASE}${ADMIN}/dashboard`, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ])
}

/* ── run ──────────────────────────────────────────────────────────────────── */

fs.mkdirSync(OUT, { recursive: true })

// Byte snapshots for the restore. Taken before anything is launched so a crash
// during setup still has them.
const citiesBefore = fs.readFileSync(CITIES_JSON)
const domainsBefore = fs.readFileSync(DOMAINS_JSON)

const require = createRequire(import.meta.url)
const pwPath =
  process.env.PW_PATH ?? '/home/kyousuke/Bajig/Intern-Project/epathways/node_modules/playwright'
const { chromium } = require(pwPath)

let browser
try {
  // Pre-flight: a leftover Stubville from an interrupted run would make
  // createDraft fail with "already exists" and every later assertion cascade.
  if (fs.existsSync(CITY_DOC) || fs.existsSync(SIDECAR)) {
    console.error(
      `refusing to start: a previous Stubville is still on disk (${CITY_DOC} / ${SIDECAR}). ` +
        'Remove it (and its content/_cities.json entry) first.',
    )
    process.exit(2)
  }

  browser = await chromium.launch({ args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  // Publish puts a window.confirm() in front of going live; nothing else in
  // the flow opens a dialog, so a blanket accept is safe and keeps the handler
  // registered for the whole run.
  page.on('dialog', (dialog) => void dialog.accept())

  await signIn(page, E2E_EMAIL, E2E_PASSWORD)
  check('sign-in lands on the dashboard', page.url() === `${BASE}${ADMIN}/dashboard`)

  /* 1. Dashboard ─────────────────────────────────────────────────────────── */
  await page.goto(`${BASE}${ADMIN}/sites`, { waitUntil: 'networkidle' })
  const dash = await text(page)
  check('dashboard renders the Site Manager shell', dash.includes('Ivy Cleans: Site Manager'))
  const rowText = async (key) =>
    (await page.locator('tbody tr', { hasText: `/${key}` }).first().textContent())
      ?.replace(/\s+/g, ' ')
      .trim() ?? ''
  const mplsRow = await rowText('minneapolis')
  check(
    'dashboard: Minneapolis LIVE',
    mplsRow.includes('Minneapolis') && mplsRow.includes('LIVE'),
    mplsRow,
  )
  const testRow = await rowText('testville')
  check(
    'dashboard: Testville DRAFT',
    testRow.includes('Testville') && testRow.includes('DRAFT'),
    testRow,
  )
  await shot(page, 'dashboard-before')

  /* 2. Create site form ───────────────────────────────────────────────────── */
  await clickText(page, 'a', 'Create Site')
  await page.waitForURL(`**${ADMIN}/new`)
  check('“Create Site” opens the form', page.url().endsWith(`${ADMIN}/new`))

  // 2a. The invalid-state path first: proves deriveFacts is the validator and
  // that the error round-trips back into the form.
  await page.fill('#city', CITY)
  await page.fill('#state', BAD_STATE)
  await page.fill('#phone', PHONE_TYPED)
  await page.fill('#notes', NOTES)
  await shot(page, 'new-form-filled')
  await page.click('button[type="submit"]')
  await page.waitForURL(`**${ADMIN}/new?error=*`)
  const errText = await text(page)
  check(
    `invalid state "${BAD_STATE}" is rejected with the reason on screen`,
    // Matches src/pipeline/facts.ts's actual wording ("unrecognised state"),
    // not the "unknown state code" this used to check for. That string went
    // stale when the State field's error message was reworded to accept
    // "FL" or "Florida" ("the State field takes FL or Florida"); the
    // validation itself was always correct, only this assertion's literal
    // was wrong.
    errText.includes('unrecognised state') && errText.includes(BAD_STATE),
    errText.slice(errText.indexOf('deriveFacts'), errText.indexOf('deriveFacts') + 60),
  )
  check(
    'no draft sidecar was created by the rejected submit',
    !fs.existsSync(SIDECAR) && !fs.existsSync(CITY_DOC),
  )
  await shot(page, 'new-form-state-error')

  // 2b. The real submission.
  await page.fill('#city', CITY)
  await page.fill('#state', STATE)
  await page.fill('#phone', PHONE_TYPED)
  await page.fill('#notes', NOTES)
  await page.click('button[type="submit"]')
  await page.waitForURL(`**${ADMIN}/generate/${KEY}`, { timeout: 60_000 })
  check('submit lands on the generate screen', page.url().endsWith(`${ADMIN}/generate/${KEY}`))

  /* 3. Stage runner ──────────────────────────────────────────────────────── */
  const genHead = await text(page)
  check(
    'generate screen shows the derived facts',
    genHead.includes(`Generating ${CITY}, ${STATE}`) && genHead.includes(PHONE_DISPLAY),
    `phoneDisplay ${PHONE_DISPLAY} derived from typed "${PHONE_TYPED}"`,
  )

  // Each <li> is a skill card: a status glyph (✓/⏳/✗/•) and the skill name
  // from SKILL_META, both tagged with data-role so markup changes elsewhere
  // in the card (activity lines, research chips) cannot shift which element
  // these selectors land on.
  const stageStates = () =>
    page.$$eval('ol li', (items) =>
      items.map((li) => ({
        icon: li.querySelector('[data-role="status-icon"]')?.textContent?.trim() ?? '',
        label: li.querySelector('[data-role="skill-name"]')?.textContent?.trim() ?? '',
      })),
    )

  // Generous: stub stages are instant, but a cold dev server compiles the
  // action modules on the first call to each.
  let allDone = false
  const deadline = Date.now() + 180_000
  while (Date.now() < deadline) {
    const states = await stageStates()
    if (states.length > 0 && states.every((s) => s.icon === '✓')) {
      allDone = true
      break
    }
    if (states.some((s) => s.icon === '✗')) break
    await page.waitForTimeout(500)
  }
  const finalStates = await stageStates()
  check(
    'all four stages complete',
    allDone && finalStates.length === 4,
    finalStates.map((s) => `${s.icon} ${s.label.slice(0, 28)}`).join(' | '),
  )
  await shot(page, 'stages-done')

  /* 3a. Skill cards + activity feed (Task 4) ────────────────────────────── */
  const genScreenText = await text(page)
  check(
    // 'Local Area Writer' was the retired 'home' stage's SKILL_META card
    // (Task 10). The 'suburb' stage that replaced it has no SKILL_META entry
    // of its own — src/app/admin/(console)/generate/[key]/stage-runner.tsx
    // falls back to `{ icon: '•', name: stage.label, tagline: '' }`, and
    // stage.label (src/content/slots.ts STAGES) is 'Writing the area pages'.
    'generate screen shows the four skill names',
    ['City Research', 'Front-Page Copywriter', 'Writing the area pages', 'Deep-Clean Copywriter'].every(
      (name) => genScreenText.includes(name),
    ),
  )

  // Stub stages are instant, so the four runStageAction calls above can beat
  // the 1.2s poll to the punch. Give the snapshot a few beats to land before
  // asserting on it. Fixture Heights (zero subdivisions) never gets a chip —
  // applyUniquenessGate drops it during the research stage itself, so
  // draft.research (what the chips render from) only ever holds the two kept
  // areas — so this waits on KEPT_SUBURBS, not the full fixture SUBURBS.
  let chipsText = genScreenText
  let chipsFound = KEPT_SUBURBS.every((s) => chipsText.includes(s))
  const chipDeadline = Date.now() + 10_000
  while (!chipsFound && Date.now() < chipDeadline) {
    await page.waitForTimeout(500)
    chipsText = await text(page)
    chipsFound = KEPT_SUBURBS.every((s) => chipsText.includes(s))
  }
  check('research chips render the two kept fixture suburbs', chipsFound, KEPT_SUBURBS.join(', '))

  // The visible research summary is the LAST 'found' event logged for the
  // stage (stage-runner.tsx's summaryEvent) — that is the "N areas kept ..."
  // line appended after the uniqueness gate runs, not the earlier
  // "areas · ZIP codes · subdivisions · search phrases" digest, which is
  // superseded once the stage is done. ("landmarks" was the pre-branch
  // field name; ResearchSchema replaced it with subdivisions.)
  const summaryMatch = chipsText.match(/\d+ areas kept(?: · \d+ thin)?(?: · \d+ dropped: [^\n<]+)?/)
  check(
    'research summary line reports how many areas were kept',
    summaryMatch !== null,
    summaryMatch?.[0] ?? chipsText.slice(0, 0),
  )
  check(
    'research summary line names Fixture Heights as dropped (zero subdivisions triggers the uniqueness gate)',
    chipsText.includes(`dropped: ${DROPPED_SUBURB}`),
    summaryMatch?.[0] ?? chipsText.slice(0, 0),
  )
  await shot(page, 'skill-cards')

  check(
    'progress log persisted a search event for research',
    (() => {
      if (!fs.existsSync(PROGRESS)) return false
      const events = JSON.parse(fs.readFileSync(PROGRESS, 'utf-8'))
      return (
        Array.isArray(events) &&
        events.some((e) => e.kind === 'search' && typeof e.label === 'string' && e.label.includes('Searching:'))
      )
    })(),
    fs.existsSync(PROGRESS) ? PROGRESS : 'file missing',
  )

  await page.waitForSelector('text=Draft ready', { timeout: 120_000 })
  check('finalize succeeds and offers “Draft ready →”', true)
  check('finalize wrote content/stubville.json', fs.existsSync(CITY_DOC))
  const citiesAfterFinalize = JSON.parse(fs.readFileSync(CITIES_JSON, 'utf-8'))
  check('finalize registered the key in _cities.json', citiesAfterFinalize.includes(KEY))

  /* 4. Review ────────────────────────────────────────────────────────────── */
  await clickText(page, 'a', 'Draft ready')
  await page.waitForURL(`**${ADMIN}/review/${KEY}`)
  const review = await text(page)
  check(
    'review screen headers the city as a DRAFT',
    review.includes(`${CITY}, ${STATE}`) && review.includes('DRAFT'),
  )
  const editorNames = await page.$$eval('input[aria-label$=" name"]', (els) =>
    els.map((el) => el.value),
  )
  check(
    // finalizeDraft carries forward draft.research.suburbs, which is
    // already post-gate — Fixture Heights never reaches the draft it
    // finalizes, so the editor can only ever list the two kept areas.
    'suburbs editor lists the two kept areas, not the dropped Fixture Heights',
    KEPT_SUBURBS.every((s) => editorNames.includes(s)) &&
      editorNames.length === KEPT_SUBURBS.length &&
      !editorNames.includes(DROPPED_SUBURB),
    editorNames.join(', '),
  )
  await shot(page, 'review-draft')

  /* 5. Preview ───────────────────────────────────────────────────────────── */
  const preview = await context.newPage()
  const res = await preview.goto(`${BASE}/${KEY}`, { waitUntil: 'networkidle' })
  check(`preview /${KEY} responds 200`, res?.status() === 200, `status ${res?.status()}`)
  const previewText = await text(preview)
  check('preview renders the generated city copy', previewText.includes(CITY))
  check(
    'preview carries the derived phone number',
    (await preview.locator(`a[href="tel:${PHONE_DIGITS}"]`).count()) > 0,
  )

  const navHrefs = await preview.$$eval('header nav a[href^="/"]', (as) =>
    as.map((a) => a.getAttribute('href')),
  )
  check(
    'preview nav links are all /stubville-prefixed',
    navHrefs.length > 0 && navHrefs.every((h) => h === `/${KEY}` || h.startsWith(`/${KEY}/`)),
    navHrefs.join(' '),
  )

  // Every other internal link is reported, not asserted: the blog cards point
  // at the shared /blog… paths and escape the preview prefix. That is a known
  // limitation (see the design spec), so it is surfaced here rather than
  // failing a run that is otherwise correct.
  const escapes = await preview.$$eval(
    'a[href^="/"]',
    (as, key) =>
      as
        .map((a) => a.getAttribute('href'))
        .filter(
          (h) =>
            h &&
            !h.startsWith(`/${key}`) &&
            !/^\/(images|icons|_next|favicon)/.test(h) &&
            !/\.\w+$/.test(h),
        ),
    KEY,
  )
  note(
    escapes.length === 0
      ? 'no preview-escaping internal links'
      : `preview-escaping links (known limitation): ${[...new Set(escapes)].join(' ')}`,
  )

  // Plan 5: finalizeDraft now stamps hasSuburbPages:true on every new draft
  // (src/content/drafts.ts), so the KEPT fixture suburbs must render as REAL
  // links, not plain text — the inverse of the pre-Plan-5 assertion here.
  // Fixture Heights is not among them: it never survives the uniqueness gate
  // in the research stage, so finalizeDraft never sees it either.
  const suburbLinks = await preview.$$eval('a', (as) =>
    as.map((a) => ({ text: a.textContent ?? '', href: a.getAttribute('href') ?? '' })),
  )
  check(
    'kept suburbs render linked (hasSuburbPages true) with /stubville/-prefixed hrefs',
    previewText.includes(KEPT_SUBURBS[0]) &&
      KEPT_SUBURBS.every((s) =>
        suburbLinks.some(
          (l) => l.text.includes(s) && (l.href === `/${KEY}` || l.href.startsWith(`/${KEY}/`)),
        ),
      ),
    suburbLinks
      .filter((l) => KEPT_SUBURBS.some((s) => l.text.includes(s)))
      .map((l) => `${l.text}→${l.href}`)
      .join(' | '),
  )
  check(
    'the dropped suburb (Fixture Heights) has no front-page link',
    !suburbLinks.some((l) => l.text.includes(DROPPED_SUBURB)),
    suburbLinks
      .filter((l) => l.text.includes(DROPPED_SUBURB))
      .map((l) => `${l.text}→${l.href}`)
      .join(' | '),
  )
  await shot(preview, 'preview-front')

  // One fixture suburb page itself, not just the link to it: fixture slugs
  // come straight from tests/fixtures/stub-pipeline.json's
  // research.structure.suburbs (the SAME canned data StubModelClient serves),
  // so this doesn't depend on the front page's own rendering of the link.
  const suburb = SUBURBS_STRUCT[0]
  const suburbRes = await preview.goto(`${BASE}/${KEY}/${suburb.slug}`, { waitUntil: 'networkidle' })
  check(
    `suburb page /${KEY}/${suburb.slug} responds 200`,
    suburbRes?.status() === 200,
    `status ${suburbRes?.status()}`,
  )
  const h1Text = (await preview.locator('h1').first().textContent())?.trim() ?? ''
  check(
    `suburb page H1 contains "${suburb.name}"`,
    h1Text.includes(suburb.name),
    h1Text,
  )
  const otherServicesHrefs = await preview.$$eval(
    'a',
    (as, name) =>
      as
        .map((a) => ({ text: a.textContent ?? '', href: a.getAttribute('href') ?? '' }))
        .filter((l) => l.text.includes(name)),
    suburb.name,
  )
  check(
    'suburb page "Other Services" links are /stubville/-prefixed',
    otherServicesHrefs.length === 2 &&
      otherServicesHrefs.every((l) => l.href.startsWith(`/${KEY}/`)),
    otherServicesHrefs.map((l) => `${l.text}→${l.href}`).join(' | '),
  )
  await shot(preview, 'preview-suburb')
  await preview.close()

  /* 6. Publish ───────────────────────────────────────────────────────────── */
  await page.bringToFront()
  /*
   * Stage 3: publish's confirmation moved from window.confirm() to a shadcn
   * AlertDialog (src/app/admin/(console)/review/[key]/publish-box.tsx)
   * so the operator sees exactly what publishing will do instead of a
   * generic "are you sure". That means clicking the "Publish" button now
   * only OPENS the dialog; the click below that used to fire the publish
   * directly now happens on the dialog's own "Publish" action button
   * instead, scoped to `[role="alertdialog"]` (Radix's AlertDialog.Content
   * sets that role) so it cannot match the still-visible trigger button
   * behind it.
   */
  await page.click('button:has-text("Publish")')
  await page.locator('[role="alertdialog"]').waitFor({ state: 'visible' })
  await shot(page, 'publish-confirm')
  await page.click('[role="alertdialog"] button:has-text("Publish")')
  /*
   * Two different renderings can legitimately be on screen a moment after
   * publish, and which one wins is a race: PublishBox swaps itself for the
   * "Live. Manual step: attach the domain…" success panel, and the
   * router.refresh() it fires immediately after re-renders the server
   * component, whose isLive branch replaces PublishBox entirely with the
   * "Live with no domain mapped yet." panel. Waiting for either is the only
   * assertion that is not a coin flip — both mean published.
   */
  await page.waitForFunction(
    () =>
      document.body.innerText.includes('Manual step: attach the domain') ||
      document.body.innerText.includes('Live with no domain mapped yet'),
    null,
    { timeout: 60_000 },
  )
  const published = await text(page)
  check(
    'publish with no domain reaches the live state',
    /Manual step: attach the domain|Live with no domain mapped yet/.test(published),
    published.includes('Manual step') ? 'success panel' : 'refreshed published panel',
  )
  const doc = JSON.parse(fs.readFileSync(CITY_DOC, 'utf-8'))
  check('published document status is live', doc.status === 'live', `status=${doc.status}`)
  check('publish with no domain left _domains.json untouched', fs.readFileSync(DOMAINS_JSON).equals(domainsBefore))
  check('publish retired the draft sidecar', !fs.existsSync(SIDECAR))
  check('publish retired the progress log', !fs.existsSync(PROGRESS))
  await shot(page, 'published')

  /* 7. Dashboard again ───────────────────────────────────────────────────── */
  await page.goto(`${BASE}${ADMIN}/sites`, { waitUntil: 'networkidle' })
  const stubRow = await rowText(KEY)
  check('dashboard shows Stubville LIVE', stubRow.includes(CITY) && stubRow.includes('LIVE'), stubRow)
  const mplsAfter = await rowText('minneapolis')
  check('Minneapolis is still LIVE after the run', mplsAfter.includes('LIVE'), mplsAfter)
  await shot(page, 'dashboard-after')

  /* 8. Leads capture end-to-end (Task 13) ──────────────────────────────────
   * Everything above this point is the Stubville pipeline and never touches
   * the database. This case is the only place in the whole leads-and-CRM
   * plan that runs the real chain: a real /minneapolis/contact submission,
   * through the real server action and src/leads/submit.ts, into a real
   * Postgres row, read back by the real admin dashboard, mutated by the
   * real status/notes server actions. Everything else (tests/leads-*.test.ts)
   * either mocks the store or is itself skipped without a database.
   *
   * Guarded on DATABASE_URL in THIS process (see the file header for why),
   * and self-cleaning: it deletes the row(s) it creates in a finally block
   * so a repeat run — or a run that fails partway — never leaves a fixture
   * lead sitting in a real inbox operator's dashboard, mirroring
   * tests/leads-store.test.ts's `ztest-` + unconditional-afterAll pattern.
   * The cityKey here is deliberately the real "minneapolis" (attribution
   * runs exactly as it would for a real customer), so the marker instead
   * lives in the email address.
   *
   * It also depends on content/minneapolis.json being `"status": "live"`.
   * That is what makes this a REAL lead rather than a draft preview, and so
   * what makes it appear in the dashboard list at all — the list hides test
   * rows by default. A draft city here would (correctly) be filed as a test
   * row and the "present in the dashboard list" check below would fail.
   */
  if (!process.env.DATABASE_URL) {
    skip(
      'leads capture end-to-end (submit → dashboard → status → notes)',
      'DATABASE_URL is not set (checked .env.local, .env, and the ambient environment). ' +
        'tests/leads-store.test.ts is skipping for the same reason — the submit-to-dashboard ' +
        'chain has never been run against a real database. Set DATABASE_URL (and start the dev ' +
        'server with it set) to exercise this case.',
    )
  } else {
    /*
     * Raw `pg`, not the generated Prisma client: Prisma 7's `prisma-client`
     * generator emits real TypeScript source (src/generated/prisma/) meant
     * to be picked up by a bundler (Next's, in the app itself -- see
     * src/leads/store.ts). This script runs as plain `node scripts/*.mjs`
     * with no bundler in front of it, and that generated source uses
     * extensionless relative imports (`./enums`) that Node's own type
     * stripping does not resolve. The cleanup below only ever needed a
     * delete-by-email and a count, so it talks to Postgres directly instead
     * of fighting that resolution gap.
     */
    const { Client } = require('pg')
    const leadsDb = new Client({ connectionString: process.env.DATABASE_URL })
    await leadsDb.connect()
    const LEAD_EMAIL = `ztest-e2e-${Date.now()}@example.com`
    const LEAD_NAME = 'Ztest E2E Runner'
    const LEAD_PHONE = '(612) 555-0199'
    const LEAD_NOTE = 'Called, left voicemail.'
    const SUCCESS_HEADING = 'Thanks, we’ve got your message.'
    try {
      const contact = await context.newPage()
      await contact.goto(`${BASE}/minneapolis/contact`, { waitUntil: 'networkidle' })
      await contact.fill('#form-field-name', LEAD_NAME)
      await contact.fill('#form-field-email', LEAD_EMAIL)
      await contact.fill('#form-field-field_66433ea', LEAD_PHONE)
      await contact.selectOption('#form-field-message', 'Yes')
      await contact.fill(
        '#form-field-field_45db7dd',
        'admin-e2e.mjs fixture submission — safe to delete.',
      )
      await shot(contact, 'leads-contact-filled')
      await contact.click('button[type="submit"]')
      await contact.waitForSelector(`text=${SUCCESS_HEADING}`, { timeout: 15_000 })

      const afterSubmit = await text(contact)
      check(
        'contact form shows the success panel in place of the form',
        afterSubmit.includes(SUCCESS_HEADING) &&
          (await contact.locator('form[aria-label="New Form"]').count()) === 0,
      )
      await shot(contact, 'leads-contact-success')
      await contact.close()

      await page.goto(`${BASE}${ADMIN}/leads`, { waitUntil: 'networkidle' })
      /*
       * Stage 2: the list row is no longer one giant <a> wrapping the whole
       * row (src/app/admin/(console)/leads/page.tsx) -- only the
       * lead's name is a link now, so the assertions below split into "the
       * link" (what gets clicked) and "the row" (what carries the city
       * pill next to that link, asserted separately). The viewport is fixed
       * at 1440x900 above, so this only ever sees the desktop <table>, never
       * the parallel md:hidden mobile-card markup.
       */
      /*
       * The lead's name is now a <button> that opens a sheet, not an <a>
       * that navigates -- the list is a master-detail so an operator can
       * read a submission without losing their place. Scoped to `table` so
       * this can only ever match the desktop row, never the parallel
       * md:hidden mobile card carrying the same name.
       */
      const leadLink = page.locator('table button', { hasText: LEAD_NAME }).first()
      check('submitted lead is present in the dashboard list', (await leadLink.count()) > 0)
      const leadRow = page.locator('tr', { hasText: LEAD_NAME }).first()
      const leadRowText = (await leadRow.textContent())?.replace(/\s+/g, ' ').trim() ?? ''
      /*
       * "Minneapolis", not "MINNEAPOLIS". This assertion was wrong from the
       * day it was written and nobody saw it, because this case has only ever
       * taken its skip path. The list's pill renders cityDisplayName()
       * (src/app/admin/(console)/leads/logic.ts), which returns the
       * city's DISPLAY NAME for a city that exists; the uppercased key is only
       * the fallback for a lead whose city has since been deleted. The lead
       * DETAIL screen is the one that uppercases (lead.cityKey.toUpperCase()).
       * Playwright's textContent() returns the DOM text either way -- CSS
       * text-transform would not have saved the old assertion.
       */
      check(
        'dashboard row carries a Minneapolis pill',
        leadRowText.includes('Minneapolis'),
        leadRowText,
      )
      await shot(page, 'leads-list')

      await leadLink.click()
      const sheet = page.getByRole('dialog')
      await sheet.waitFor({ state: 'visible', timeout: 15_000 })
      const sheetText = (await sheet.textContent())?.replace(/\s+/g, ' ').trim() ?? ''
      check('clicking a lead opens the submission sheet', sheetText.includes(LEAD_NAME))
      /*
       * The whole point of the sheet: the operator sees the QUESTIONS, not
       * just the answers. "How Can We Help?" is a contact-form field that
       * this submission left blank, so its presence also proves unanswered
       * questions are still rendered rather than silently dropped.
       */
      check(
        'the sheet shows the contact form’s questions',
        sheetText.includes('How Can We Help?'),
        sheetText.slice(0, 200),
      )
      await shot(page, 'leads-sheet')

      // The full page still exists -- it is what the notification email
      // deep-links to -- and the sheet offers a way through to it.
      await sheet.getByRole('link', { name: /Open as a full page/i }).click()
      await page.waitForURL(`**${ADMIN}/leads/*`)
      const detailBefore = await text(page)
      check('lead detail page opens for the submitted lead', detailBefore.includes(LEAD_NAME))
      // The detail screen is the one that uppercases the city (it renders
      // lead.cityKey.toUpperCase(), not the display-name lookup the list
      // uses). Asserted explicitly so the two renderings stay distinguishable
      // and the list assertion above cannot silently drift back.
      check(
        'lead detail page shows the uppercased city key',
        detailBefore.includes('MINNEAPOLIS'),
      )

      /*
       * Stage 2: the five status buttons collapsed into one shadcn Select
       * (src/app/admin/(console)/leads/[id]/status-select.tsx). Its
       * trigger is a Radix button labelled "Lead status"; picking an option
       * calls the same setStatusAction directly (wrapped in useTransition,
       * not a <form> submit), so this assertion moved from clicking a
       * literal "contacted" button to opening the Select and choosing the
       * "contacted" option, then confirming the header LeadStatusChip
       * updates on its own -- no manual reload -- exactly like the old
       * per-status <form> did.
       */
      await page.click('[aria-label="Lead status"]')
      await page.getByRole('option', { name: 'contacted', exact: true }).click()
      await page.waitForFunction(() => document.body.innerText.includes('CONTACTED'), null, {
        timeout: 15_000,
      })
      const afterStatus = await text(page)
      check(
        'picking "contacted" in the status Select renders the CONTACTED chip',
        afterStatus.includes('CONTACTED'),
      )
      await shot(page, 'leads-detail-contacted')

      await page.fill('textarea[name="notes"]', LEAD_NOTE)
      await page.click('button:has-text("Save notes")')
      // saveNotesAction only revalidates the detail path; give the write a
      // moment to land before the reload below re-reads it from storage.
      await page.waitForTimeout(500)
      await page.reload({ waitUntil: 'networkidle' })
      const notesValue = await page.inputValue('textarea[name="notes"]')
      check('saved note survives a reload', notesValue === LEAD_NOTE, notesValue)
      await shot(page, 'leads-detail-note-saved')
    } catch (err) {
      check(
        'leads capture end-to-end completed without throwing',
        false,
        err instanceof Error ? err.message : String(err),
      )
    } finally {
      // Unconditional, like tests/leads-store.test.ts's afterAll: runs whether
      // the case above passed, failed a check, or threw. Deletes by the
      // unique fixture email rather than by id, since a throw before the
      // dashboard list step means this script never captured an id.
      await leadsDb.query('DELETE FROM "Lead" WHERE email = $1', [LEAD_EMAIL])
      const { rows } = await leadsDb.query(
        'SELECT COUNT(*)::int AS count FROM "Lead" WHERE email = $1',
        [LEAD_EMAIL],
      )
      const remaining = rows[0].count
      check('cleanup deleted every row this case created', remaining === 0, `remaining=${remaining}`)
      await leadsDb.end()
    }
  }

  /* 9. Sign-out ──────────────────────────────────────────────────────────── */
  /*
   * Built in Task 9, wired into the identity chip in Task 12, correct by
   * inspection in two reviews, and never once actually executed -- both
   * tasks were barred from creating the seeded account this needs. Reuses
   * `page`, which by this point has done everything above as the signed-in
   * admin, so a failure here cannot be blamed on a fresh, differently-primed
   * context.
   *
   * `header button` is unambiguous: layout.tsx's header renders exactly one
   * button-shaped element, the identity chip's DropdownMenuTrigger (the logo
   * is a Link, the nav is all <a>s).
   */
  await page.goto(`${BASE}${ADMIN}/dashboard`, { waitUntil: 'networkidle' })
  await page.click('header button')
  await page.click('button:has-text("Sign out")')
  await page.waitForURL(`${BASE}${ADMIN}/login`, { timeout: 15000 })
  check('sign out lands on /admin/login', page.url() === `${BASE}${ADMIN}/login`)
  await page.goto(`${BASE}${ADMIN}/dashboard`, { waitUntil: 'networkidle' })
  // Bounced back to login by the proxy's optimistic redirect (no session
  // cookie -> resolveAdminRedirect appends ?next=), not the bare login URL
  // signIn() waits for -- startsWith, not equality, is the correct check.
  check(
    'signed-out context can no longer open /admin/dashboard',
    page.url().startsWith(`${BASE}${ADMIN}/login`),
    page.url(),
  )

  /* 10. Signup is refused ────────────────────────────────────────────────── */
  /*
   * better-auth mounts POST /api/auth/sign-up/email automatically whenever
   * emailAndPassword is enabled -- nothing in this app's UI has to link to
   * it for it to exist. `disableSignUp: true` in src/lib/auth.ts is the
   * ONLY thing that refuses it (tests/better-auth-api.test.ts asserts the
   * config is set; this proves the config actually does something against
   * the real running server). Plain fetch(), not Playwright -- this is an
   * anonymous API call, no browser session involved. Uses its own throwaway
   * address rather than E2E_EMAIL/E2E_MANAGER_EMAIL so a bug in this case
   * can never collide with either seeded account.
   *
   * The explicit Origin header matters: without it, better-auth's CSRF
   * origin check rejects the request first with 403
   * MISSING_OR_NULL_ORIGIN -- Node's fetch(), unlike a browser or curl,
   * sends no Origin header of its own. A real browser submitting this form
   * always carries one matching its own origin, so setting it to BASE is
   * the correct way to reach the check this case actually means to probe
   * (disableSignUp), not an artifact of curl's laxer defaults.
   */
  const SIGNUP_PROBE_EMAIL = `e2e-signup-probe-${Date.now()}@example.invalid`
  const signupRes = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ email: SIGNUP_PROBE_EMAIL, password: 'probe-password-123', name: 'Signup Probe' }),
  })
  const signupBody = await signupRes.json().catch(() => null)
  check(
    'anonymous sign-up is refused with EMAIL_PASSWORD_SIGN_UP_DISABLED',
    signupRes.status === 400 && signupBody?.code === 'EMAIL_PASSWORD_SIGN_UP_DISABLED',
    `status ${signupRes.status}, body ${JSON.stringify(signupBody)}`,
  )
  if (process.env.DATABASE_URL) {
    const { Client } = require('pg')
    const signupDb = new Client({ connectionString: process.env.DATABASE_URL })
    await signupDb.connect()
    try {
      const { rows } = await signupDb.query('SELECT COUNT(*)::int AS count FROM "user" WHERE email = $1', [
        SIGNUP_PROBE_EMAIL,
      ])
      check('refused sign-up created no user row', rows[0].count === 0, `count=${rows[0].count}`)
      // Defense in depth: delete unconditionally in case the refusal above
      // ever regresses and a row DOES get created -- never leave a fixture
      // account behind even in that failure case.
      await signupDb.query('DELETE FROM "user" WHERE email = $1', [SIGNUP_PROBE_EMAIL])
    } finally {
      await signupDb.end()
    }
  } else {
    skip(
      'refused sign-up created no user row',
      'DATABASE_URL is not set in this process, so the no-row-created half of the signup-refusal case cannot be verified (the refusal itself was still checked above).',
    )
  }

  /* 11. Manager RBAC split ───────────────────────────────────────────────── */
  /*
   * The unit tests cover the policy (tests/access.test.ts) and that each
   * action calls a guard (tests/auth-guards.test.ts); only this proves a
   * real browser holding a real manager session cannot open Sites.
   */
  const managerCtx = await browser.newContext()
  const manager = await managerCtx.newPage()
  await signIn(manager, E2E_MANAGER_EMAIL, E2E_MANAGER_PASSWORD)
  check('manager sign-in lands on the dashboard', manager.url() === `${BASE}${ADMIN}/dashboard`)
  check('manager sees no Sites tab', (await manager.locator('nav a', { hasText: 'Sites' }).count()) === 0)
  await manager.goto(`${BASE}${ADMIN}/sites`, { waitUntil: 'networkidle' })
  check('manager is bounced off /admin/sites', manager.url() === `${BASE}${ADMIN}/dashboard`)
  await managerCtx.close()
} catch (err) {
  check('run completed without throwing', false, err instanceof Error ? err.message : String(err))
} finally {
  if (browser) await browser.close()

  if (KEEP) {
    note('--keep: leaving content/ as the run left it (Stubville is still on disk)')
  } else {
    // PROGRESS is normally already gone by publish, but an aborted run (a
    // failed check throws nothing — check() just logs — so this only misses
    // it on an uncaught exception before publish) can leave it behind.
    for (const file of [CITY_DOC, SIDECAR, PROGRESS]) fs.rmSync(file, { force: true })
    fs.writeFileSync(CITIES_JSON, citiesBefore)
    fs.writeFileSync(DOMAINS_JSON, domainsBefore)
    const clean =
      !fs.existsSync(CITY_DOC) &&
      !fs.existsSync(SIDECAR) &&
      !fs.existsSync(PROGRESS) &&
      fs.readFileSync(CITIES_JSON).equals(citiesBefore) &&
      fs.readFileSync(DOMAINS_JSON).equals(domainsBefore)
    check('cleanup restored content/ byte-for-byte', clean)
  }
}

const failed = results.filter((r) => !r.ok)
console.log('\n──────── summary ────────')
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`)
console.log(`${results.length - failed.length}/${results.length} checks passed`)
if (skipped.length > 0) {
  console.log(`${skipped.length} case(s) SKIPPED — not counted as pass or fail:`)
  for (const s of skipped) console.log(`  SKIP  ${s.name} — ${s.reason}`)
}
console.log(`screenshots: ${OUT}`)
process.exit(failed.length === 0 ? 0 : 1)
