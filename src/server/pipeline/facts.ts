// Facts are derived in code, never by the model: a wrong digit in a phone number costs every lead.

// full name -> code, built from STATE_NAMES; keyed on a normalised form
import type { MarketOps } from './schemas'

const CODE_BY_NAME: Record<string, string> = {}

/** Lowercase, collapse internal runs of whitespace, trim. "  new   MEXICO "
 * and "New Mexico" have to reach the same key. */
function normalizeStateInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

// 'FL' or 'Florida' -> 'FL', else null. Not fuzzy: this ends up in published copy.
export function resolveStateCode(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const upper = trimmed.toUpperCase()
  if (STATE_NAMES[upper]) return upper
  return CODE_BY_NAME[normalizeStateInput(trimmed)] ?? null
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
}

for (const [code, name] of Object.entries(STATE_NAMES)) {
  CODE_BY_NAME[normalizeStateInput(name)] = code
}

export interface DeriveFactsInput {
  /** Display name; leading/trailing whitespace is trimmed here. */
  city: string
  /** Two-letter code, any case. */
  state: string
  /** PRE-STRIPPED: exactly 10 raw digits — the caller (admin form) removes all formatting first. */
  phoneDigits: string
  address?: string
  /** Operator-entered market facts. Passes through untouched — see Facts.ops. */
  ops?: MarketOps
}

export interface Facts {
  city: string
  state: string
  stateName: string
  phone: string
  phoneDisplay: string
  phoneHref: string
  address?: string
  // operator-entered market facts; prompts must use every present field
  ops?: MarketOps
}

/** Formats a validated 10-digit string as `305-555-0142`. */
function formatDashed(digits: string): string {
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

/** Formats a validated 10-digit string as `(305) 555-0142`. */
function formatDisplay(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function deriveFacts(input: DeriveFactsInput): Facts {
  const { phoneDigits, address, ops } = input
  const city = input.city.trim()

  if (!/^\d{10}$/.test(phoneDigits)) {
    throw new Error(
      `deriveFacts: phoneDigits must be exactly 10 digits, got ${JSON.stringify(phoneDigits)}`
    )
  }

  const state = resolveStateCode(input.state)
  if (state === null) {
    throw new Error(
      `deriveFacts: unrecognised state ${JSON.stringify(input.state)} -- ` +
        'expected a two-letter code (FL) or a full state name (Florida)',
    )
  }
  const stateName = STATE_NAMES[state]

  const facts: Facts = {
    city,
    state,
    stateName,
    phone: formatDashed(phoneDigits),
    phoneDisplay: formatDisplay(phoneDigits),
    phoneHref: `tel:${phoneDigits}`,
  }

  if (address !== undefined) facts.address = address
  if (ops !== undefined) facts.ops = ops

  return facts
}
