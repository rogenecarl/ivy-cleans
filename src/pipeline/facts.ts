/**
 * FACTS are derived in code, never by the model.
 *
 * Phone numbers, phone formats, and state names are the kind of thing a
 * language model will happily hallucinate a single wrong digit or a
 * plausible-but-wrong state name into — and a wrong digit here costs every
 * lead the generated city page would otherwise send. So none of this ever
 * goes through a prompt: it's derived deterministically from the operator's
 * form input, the same way every time.
 */

/*
 * Full name back to code, built from STATE_NAMES so the two can never fall
 * out of step. Keyed on a normalised form (lowercased, whitespace collapsed)
 * so "florida", "FLORIDA" and " Florida " all land on the same entry.
 */
import type { MarketOps } from './schemas'

const CODE_BY_NAME: Record<string, string> = {}

/** Lowercase, collapse internal runs of whitespace, trim. "  new   MEXICO "
 * and "New Mexico" have to reach the same key. */
function normalizeStateInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Accepts either form the operator might reasonably type -- "FL" or
 * "Florida" -- and returns the two-letter code, or null if it is neither.
 *
 * WHY BOTH INPUTS BUT ONE STORED VALUE. Everything downstream (the {ST} and
 * {stateName} tokens, content/<city>.json, the validator) deals only in the
 * code; widening what is ACCEPTED costs nothing there, while storing whatever
 * was typed would give two spellings of one state and let the two tokens
 * disagree between pages.
 *
 * Deliberately NOT fuzzy. "Fla.", "Flor" and misspellings are rejected rather
 * than guessed at: this value ends up in published copy on a customer-facing
 * site, and a wrong guess is far worse than an error message the operator can
 * act on immediately.
 */
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
  notes?: string
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
  notes?: string
  /**
   * Operator-entered facts about this market: who leads the crew, how long
   * we have served it, how many homes we have cleaned, real reviews, and the
   * ZIP codes we actually serve.
   *
   * Travels the same road as the phone number — a human typed it, so it is
   * fact and the model never touches it. Prompts are REQUIRED to use every
   * field that is present; the quality validator fails a page that received
   * one and ignored it.
   */
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
  const { phoneDigits, address, notes, ops } = input
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
  if (notes !== undefined) facts.notes = notes
  if (ops !== undefined) facts.ops = ops

  return facts
}
