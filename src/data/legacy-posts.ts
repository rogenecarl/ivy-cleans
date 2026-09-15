// The WordPress-era post URLs. Their content is gone; the slugs stay reserved and redirect to the blog listing.
export const LEGACY_POST_SLUGS: readonly string[] = [
  '10-questions-to-ask-house-cleaning-services-a-comprehensive-guide',
  'cleaning-co-redefining-cleaning-standards',
  'do-i-need-to-be-home-during-a-deep-cleaning-service',
  'guide-to-basement-cleaning-services-near-you',
  'how-to-clean-bathroom-countertops',
  'how-to-clean-bathroom-walls',
  'how-to-clean-cabinets-before-painting',
  'how-to-clean-smoke-detectors',
  'what-is-included-in-a-deep-cleaning-of-a-house',
  'what-to-do-in-st-louis-park-mn',
  'when-you-hire-a-company-for-deep-cleaning-your-house-do-you-tip-the-workers-too',
]

const LEGACY = new Set(LEGACY_POST_SLUGS)

export function isLegacyPostSlug(slug: string): boolean {
  return LEGACY.has(slug)
}
