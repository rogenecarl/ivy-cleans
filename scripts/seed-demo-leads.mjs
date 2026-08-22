// scripts/seed-demo-leads.mjs
/*
 * Inserts two sample leads -- one from the booking form, one from the contact
 * form -- so the Leads screen has something to show in a demo.
 *
 *   node --env-file=.env scripts/seed-demo-leads.mjs          # insert
 *   node --env-file=.env scripts/seed-demo-leads.mjs --clean  # remove them
 *
 * WHY RAW `pg` AND NOT PRISMA. This is a standalone script, and the Prisma
 * client here is generated TypeScript that a bare `node` cannot import
 * without a compile step. `pg` is already a dependency (store.ts's pool runs
 * on it), so this needs no toolchain and no build.
 *
 * WHY THE ANSWER KEYS ARE FULL QUESTIONS. The payload column is keyed by the
 * human label, not the Elementor field id -- see src/leads/schema.ts, where
 * `payload[field.label] = ...`. These strings must therefore match
 * BOOKING_FIELDS/CONTACT_FIELDS EXACTLY, typos included ("Are Your Looking",
 * "How Would Your Describe"), or the dashboard renders the question as
 * unanswered and files the answer under "Other". `verifyLabels` below fails
 * loudly if they ever drift apart.
 *
 * These rows are inserted as ORDINARY leads (isTest = false) so they appear
 * the moment the screen loads, with no toggle to find first. That is a
 * deliberate demo choice: they are real rows in the real database, they are
 * named so nobody could mistake them for customers, and `--clean` removes
 * exactly them and nothing else.
 */
import { readFileSync } from 'node:fs'
import pg from 'pg'

/** The marker every seeded row carries, and the ONLY thing --clean matches
 * on. Deliberately not a name or an email: those are displayed and might
 * plausibly be edited during a demo, whereas nothing in the UI writes ipHash. */
const MARKER = 'demo-seed-v1'

const BOOKING = {
  cityKey: 'minneapolis',
  formType: 'booking',
  name: 'Sample Booking — Jane Rivera',
  email: 'jane.rivera@example.com',
  phone: '612-555-0148',
  payload: {
    'What Type of Service Are Your Looking For?': 'Deep Cleaning (Most Popular)',
    'How Would Your Describe Your Home Right Now?': 'Slightly Dirty (Nothing crazy)',
    'How Many Bedrooms?': '3',
    'How Many Bathrooms?': '2',
    'How Soon Are You Looking To Have This Cleaned?': 'Within the next two weeks',
    'What’s the Address of the Property?': '4412 Girard Ave S, Minneapolis, MN 55409',
    'Full Name': 'Jane Rivera',
    'Email Address': 'jane.rivera@example.com',
    'Phone Number': '612-555-0148',
    'How Would You Prefer To Be Contacted?': 'Call Me',
  },
}

const CONTACT = {
  cityKey: 'minneapolis',
  formType: 'contact',
  name: 'Sample Contact — Marcus Bell',
  email: 'marcus.bell@example.com',
  phone: '612-555-0193',
  payload: {
    Name: 'Marcus Bell',
    Email: 'marcus.bell@example.com',
    'Phone Number': '612-555-0193',
    'Are You Looking For Help With A Cleaning Project?': 'Move In / Move Out Cleaning',
    'How Can We Help?':
      'We are handing back the keys on a two bedroom rental at the end of the month and the lease asks for a professional clean. Could you send a quote and let me know your earliest date?',
  },
}

/*
 * Reads the labels straight out of schema.ts and compares them to the keys
 * above. A regex rather than an import, for the same no-toolchain reason as
 * the pg choice -- it only needs the label strings, which are plain literals.
 *
 * This exists because a silent mismatch is invisible in exactly the situation
 * the seed is for: the row inserts fine, the screen renders, and the question
 * quietly reads "Not answered" in front of the client.
 */
function verifyLabels() {
  const src = readFileSync(new URL('../src/leads/schema.ts', import.meta.url), 'utf8')
  const section = (name) => {
    const start = src.indexOf(`export const ${name}`)
    if (start === -1) throw new Error(`${name} not found in src/leads/schema.ts`)
    /* The array's closing bracket is a `]` at the START of a line. Searching
     * for a bare ']' finds the one inside "form_fields[email]" instead and
     * truncates the section to nothing -- which is exactly the false alarm
     * this guard raised the first time it ran. */
    const end = src.indexOf('\n]', start)
    if (end === -1) throw new Error(`${name}: could not find the end of the array`)
    return [...src.slice(start, end).matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1])
  }
  const problems = []
  for (const [name, row] of [
    ['BOOKING_FIELDS', BOOKING],
    ['CONTACT_FIELDS', CONTACT],
  ]) {
    const expected = section(name)
    if (expected.length === 0) problems.push(`${name}: no labels parsed`)
    for (const label of expected) {
      if (!(label in row.payload)) problems.push(`${name}: seed is missing "${label}"`)
    }
    for (const key of Object.keys(row.payload)) {
      if (!expected.includes(key)) problems.push(`${name}: seed has unknown key "${key}"`)
    }
  }
  if (problems.length > 0) {
    console.error('Seed data no longer matches src/leads/schema.ts:')
    for (const p of problems) console.error('  -', p)
    console.error('\nFix the payload keys above, then re-run. Nothing was written.')
    process.exit(1)
  }
}

async function main() {
  const clean = process.argv.includes('--clean')
  if (!clean) verifyLabels()

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Run with: node --env-file=.env scripts/seed-demo-leads.mjs')
    process.exit(1)
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 30000,
  })
  await client.connect()
  try {
    if (clean) {
      const { rowCount } = await client.query('delete from "Lead" where "ipHash" = $1', [MARKER])
      console.log(`Removed ${rowCount} seeded demo lead(s).`)
      return
    }

    // Idempotent: re-running replaces the previous seed rather than stacking
    // duplicates every time someone rehearses the demo.
    const { rowCount: removed } = await client.query('delete from "Lead" where "ipHash" = $1', [
      MARKER,
    ])
    if (removed > 0) console.log(`Replaced ${removed} existing seeded lead(s).`)

    for (const [row, offsetMinutes, status] of [
      [BOOKING, 35, 'new'],
      [CONTACT, 260, 'contacted'],
    ]) {
      await client.query(
        `insert into "Lead"
           ("id","cityKey","formType","name","email","phone","payload",
            "status","notes","emailStatus","isTest","ipHash","submittedAt","updatedAt")
         values (gen_random_uuid(), $1, $2::"FormType", $3, $4, $5, $6::jsonb,
                 $7::"LeadStatus", $8, 'sent'::"EmailStatus", false, $9,
                 now() - ($10 || ' minutes')::interval, now())`,
        [
          row.cityKey,
          row.formType,
          row.name,
          row.email,
          row.phone,
          JSON.stringify(row.payload),
          status,
          status === 'contacted'
            ? 'Left a voicemail. Sending a quote once he confirms the move-out date.'
            : '',
          MARKER,
          String(offsetMinutes),
        ],
      )
      console.log(`Inserted ${row.formType} lead: ${row.name}`)
    }
    console.log('\nOpen the Leads screen to see them. Remove with --clean when the demo is done.')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  /*
   * An AggregateError from `pg` prints as an EMPTY message -- every real
   * cause is hidden in `err.errors`, one entry per address tried. Unwrapped,
   * a failure to reach the database reads as "Seeding failed:" and nothing
   * else, which says nothing about whether the credential is wrong, the host
   * is down, or the network has no route.
   */
  console.error('Seeding failed:', err.message || err.code || err.name || err)
  if (Array.isArray(err.errors)) {
    for (const sub of err.errors) console.error(`  - ${sub.code}: ${sub.message}`)
    const v6 = err.errors.filter((e) => e.code === 'ENETUNREACH').length
    const v4 = err.errors.filter((e) => e.code === 'ETIMEDOUT').length
    if (v6 > 0 && v4 === 0) {
      console.error(
        '\nEvery IPv6 address was unreachable while IPv4 was not tried to exhaustion.',
      )
      console.error('This machine likely has no IPv6 route. Try DB_DISABLE_HAPPY_EYEBALLS=1.')
    } else if (v4 > 0) {
      console.error('\nThe database host is not reachable from this machine at all.')
      console.error('Check the network/firewall and that the Neon project is not suspended.')
    }
  }
  process.exit(1)
})
