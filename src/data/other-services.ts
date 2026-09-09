import type { Suburb } from '../content/types'
import type { ServiceSlug } from './services/registry'

// Three services per area, chosen from its research so sibling area pages don't all link the same two.
// Rentals -> Airbnb, new builds -> post-construction, apartments/condos -> apartment, then deep + standard + move-out.
const RULES: { slug: ServiceSlug; pattern: RegExp }[] = [
  { slug: 'airbnb-cleaning', pattern: /\b(short[- ]term|vacation (home|rental)s?|airbnb|rental(s| propert)|investor)/i },
  { slug: 'post-construction-cleaning', pattern: /\b(new[- ]construction|newer builds?|newest housing|new builds?|under construction|being built)/i },
  { slug: 'apartment-cleaning', pattern: /\b(apartments?|condo(minium)?s?|townho(me|use)s?|high[- ]rises?)\b/i },
]

const DEFAULTS: ServiceSlug[] = ['deep-cleaning', 'standard-cleaning', 'move-in-move-out-cleaning']

export const OTHER_SERVICES_COUNT = 3

export function pickOtherServices(
  suburb: Pick<Suburb, 'housingCharacter' | 'conditions'> | undefined,
): ServiceSlug[] {
  const text = suburb
    ? [suburb.housingCharacter, ...suburb.conditions.map((c) => `${c.condition} ${c.implication}`)].join(' ')
    : ''
  const picked: ServiceSlug[] = []
  for (const rule of RULES) {
    if (picked.length < OTHER_SERVICES_COUNT - 1 && rule.pattern.test(text)) picked.push(rule.slug)
  }
  for (const slug of DEFAULTS) {
    if (picked.length < OTHER_SERVICES_COUNT && !picked.includes(slug)) picked.push(slug)
  }
  return picked
}
