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
  /** Slugs of the areas next to this one; symmetric. Absent on documents that predate the field. */
  neighbors?: string[]
}

// a real customer review; firstName and area make it checkable
export type MarketReview = { quote: string; firstName: string; area: string; date?: string }

// mirrors MarketOpsSchema, declared structurally so this module stays free of zod
// a photo of this crew or market; alt written by the operator
export type MarketPhoto = { path: string; alt: string }

export type MarketOps = {
  zips?: string[]
  servingSince?: string
  crewLead?: string
  crewSize?: number
  homesCleaned?: number
  reviews?: MarketReview[]
  photos?: MarketPhoto[]
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
  // generated copy by slot id; static copy stays in src/data with {tokens}
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
  // domain routed but not yet observed serving; cleared once a liveness check succeeds
  provisioning?: { since: string; domain: string }
  // operator-entered facts, kept on the document so they survive publish. Nothing renders this directly.
  ops?: MarketOps
}
