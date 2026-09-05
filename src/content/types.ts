export type Condition = { condition: string; implication: string; copySafe: boolean }

export type Suburb = {
  name: string
  slug: string
  /** Named developments inside this area — the strongest local signal available. */
  subdivisions: string[]
  /** Build era, typical size, flooring, HOA prevalence. One or two sentences. */
  housingCharacter: string
  /** Conditions specific to THIS area. Metro-wide ones live on research.conditions. */
  conditions: Condition[]
}

/**
 * A real customer review from this market. `firstName` and `area` are what
 * make the quote checkable rather than decorative, so both are required.
 */
export type MarketReview = { quote: string; firstName: string; area: string; date?: string }

/**
 * Operator-entered facts about a market — mirrors MarketOpsSchema in
 * src/pipeline/schemas.ts, declared structurally here for the same reason
 * Suburb above is: this module is the content layer's own vocabulary and
 * stays free of zod and of the pipeline.
 */
export type MarketOps = {
  zips?: string[]
  servingSince?: string
  crewLead?: string
  crewSize?: number
  homesCleaned?: number
  reviews?: MarketReview[]
}

export type CityContent = {
  /** Display name, e.g. "Minneapolis". */
  city: string
  /** Two-letter code, e.g. "MN". */
  state: string
  /** FACT — entered by a human, never through a model. */
  phone: string
  phoneHref: string
  address: string
  status: 'draft' | 'live'
  domain?: string
  research: {
    /** Slugs are STORED, never derived — live-site URL patterns vary. */
    suburbs: Suburb[]
    zips: string[]
    conditions: Condition[]
    mapEmbedUrl: string | null
  }
  /**
   * AI- and research-written copy, keyed by slot id. Static copy never
   * lives here — it stays in src/data with {tokens} for city mentions.
   */
  sections: Record<string, string | string[]>
  /** Full state name for SEO copy, e.g. "Minnesota" (spec finding 5). */
  stateName: string
  /** Display-format phone used by the booking pages, e.g. "(612) 424-0391" (finding 6b). */
  phoneDisplay: string
  /** Contact-page address variant; falls back to `address` when absent (three live variants). */
  contactAddress?: string
  /** The three map embeds (finding 6): null renders no map. */
  maps: {
    front: string | null
    home: string | null
    contact: string | null
  }
  /** Suburb pages exist only for Minneapolis; false renders Areas We Serve unlinked. */
  hasSuburbPages: boolean
  /**
   * Set when a domain has been bought, pointed and routed but NOT yet
   * observed serving — DNS and TLS take minutes and publishCity does not wait
   * for them (that wait is a serverless timeout; see publishCity).
   *
   * The site is live from the host's side either way; this only records that
   * nobody has confirmed it answers. Cleared once a liveness check succeeds.
   */
  provisioning?: { since: string; domain: string }
  /**
   * FACTS — typed by a human, never through a model. Carried here so they
   * survive publish: publishCity deletes the draft sidecar that held them,
   * and nothing can research or regenerate who leads a crew.
   *
   * Nothing renders this directly. The prompts consume it and the copy in
   * `sections` carries the result; this is the record of what they were
   * given, what the ops editor edits, and what a future regeneration reuses.
   * `ops.zips` is the operator's own list — `research.zips` is what actually
   * gets printed, and finalizeDraft prefers this one when it is non-empty.
   */
  ops?: MarketOps
}
