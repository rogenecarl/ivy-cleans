import { describe, expect, it } from 'vitest'
import { legacyTarget, LEGACY_POST_SLUGS } from '@/site/data/legacy-urls'

describe('legacyTarget', () => {
  it('sends an old post with no closer page to the blog', () => {
    expect(legacyTarget('how-to-clean-a-microwave')).toBe('/blog')
  })

  it('sends a topic post to the service that answers it', () => {
    expect(legacyTarget('house-cleaning-rates-in-minneapolis')).toBe('/cleaning-services')
    expect(legacyTarget('how-do-i-prepare-my-house-for-deep-cleaning')).toBe('/services/deep-cleaning')
    expect(legacyTarget('move-in-out-cleaning-checklist')).toBe('/services/move-in-move-out-cleaning')
  })

  it('sends the old pages to their replacements', () => {
    expect(legacyTarget('book')).toBe('/book-now')
    expect(legacyTarget('move-in-move-out-cleaning-st-paul-mn')).toBe('/services/move-in-move-out-cleaning')
  })

  it('lets the injected spam page and unknown slugs 404', () => {
    expect(legacyTarget('vavada-casino')).toBeNull()
    expect(legacyTarget('cleaning-services-edina')).toBeNull()
    expect(LEGACY_POST_SLUGS).not.toContain('vavada-casino')
  })

  it('covers every old post', () => {
    expect(LEGACY_POST_SLUGS).toHaveLength(93)
  })
})
