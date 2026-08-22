// src/data/service-types.ts
/*
 * The shape every service page's content builder returns.
 *
 * This is DeepCleaningData renamed field-for-field, deliberately: the template
 * under src/components/service/ was extracted from the deep-cleaning
 * components, and deep cleaning has to keep rendering byte-identically through
 * it. Changing the shape while extracting would leave two variables in that
 * check instead of one.
 */
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
  /* h2BreakAfter: how many words of `h2` sit on the first line of the
   * desktop hard break (see components/service/WhatIs.tsx). Defaults to 3,
   * which is what the live deep-cleaning heading needs. Rule of thumb when
   * setting it for a new service: break AFTER the ampersand, never before
   * it, and never inside a proper noun. */
  whatIs: { h2: string; text: string; image: string; h2BreakAfter?: number }
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
