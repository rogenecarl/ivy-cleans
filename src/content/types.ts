export type Suburb = { name: string; slug: string }

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
    landmarks: string[]
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
}
