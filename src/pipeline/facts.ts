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

export interface DeriveFactsInput {
  /** Display name; leading/trailing whitespace is trimmed here. */
  city: string
  /** Two-letter code, any case. */
  state: string
  /** PRE-STRIPPED: exactly 10 raw digits — the caller (admin form) removes all formatting first. */
  phoneDigits: string
  address?: string
  notes?: string
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
  const { phoneDigits, address, notes } = input
  const city = input.city.trim()

  if (!/^\d{10}$/.test(phoneDigits)) {
    throw new Error(
      `deriveFacts: phoneDigits must be exactly 10 digits, got ${JSON.stringify(phoneDigits)}`
    )
  }

  const state = input.state.toUpperCase()
  const stateName = STATE_NAMES[state]
  if (!stateName) {
    throw new Error(`deriveFacts: unknown state code ${JSON.stringify(state)}`)
  }

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

  return facts
}
