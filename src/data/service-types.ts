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
  whatIs: { h2: string; text: string; image: string }
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
