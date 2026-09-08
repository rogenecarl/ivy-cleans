// src/data/service-types.ts
// Shape every service page's content builder returns (DeepCleaningData, renamed).
export type ServiceQuality = {
  title: string
  text: string
  icon: string
  width: number
  height: number
}

export type ServiceContent = {
  meta: { title: string; description: string }
  hero: { h1: string; paragraphs: string[] }
  /* words on the first line before the desktop <br> in WhatIs; default 3. Break after an ampersand, never inside a proper noun. */
  /* the one generated field on a service page (service.<slug>.local); `text` stays canonical. Optional: Minneapolis has none. */
  whatIs: { h2: string; text: string; image: string; h2BreakAfter?: number; local?: string }
  benefitsBgImage: string
  benefits: {
    h2: string
    intro: string[]
    listIntro: string
    items: string[]
    outro: string
  }
  services: {
    h2: string
    image: string
    listIntro: string
    items: string[]
    note: string
    contact: string
  }
  /* The live deep-cleaning page turns one list item into a link. Preserved
   * rather than dropped: dropping it would change that page's markup. */
  servicesLinkHref: string
  servicesLinkedItemIndex: number
  whyChoose: {
    h2: string
    paragraphs: string[]
    listIntro: string
    qualities: ServiceQuality[]
    closing: string
    contact: string
  }
}
