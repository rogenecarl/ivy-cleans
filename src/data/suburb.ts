// Template copy verbatim from suburb-savage-content-dump.txt (page 664); tokens {suburb} {ST} {city}.
// hero/houseCleaning/benefits read the generated suburb.<slug>.intro/.homes/.local slots and fall back to
// the template when absent (Minneapolis has no generated area copy). Takes the suburb ref: it repeats per area.

import type { CityContent, MarketPhoto } from '../content/types'
import { cityHref, t } from '../content/interpolate'
import { sOpt, suburbSlots } from '../content/slots'
import { metaDescription } from './meta'

export type SuburbRef = { name: string; slug: string }

export type SuburbData = {
  suburbMeta: { title: string; description: string }
  hero: { titleLines: [string, string]; paragraphs: string[]; ctaLabel: string }
  houseCleaning: { heading: string; paragraph: string }
  benefits: { heading: string; paragraphs: string[] }
  otherServices: { heading: string; intro: string; links: { label: string; href: string }[] }
  workInAction: { heading: string; images: MarketPhoto[] }
  closing: { heading: string; paragraph: string; ctaLabel: string }
}

const CTA_LABEL = 'Set an appointment 👈' // dump lines 21, 34, 42

export function suburbData(c: CityContent, suburb: SuburbRef): SuburbData {
  const { name } = suburb
  const [introSlot, homesSlot, localSlot] = suburbSlots(suburb.slug)
  const intro = sOpt(c, introSlot)
  const homes = sOpt(c, homesSlot)
  const local = sOpt(c, localSlot)

  return {
    // title/description from suburb-savage.html
    suburbMeta: {
      title: `House Cleaning Service In ${name}, ${c.state}`,
      // generated homes copy when present; the template line is only the fallback
      description:
        homes !== undefined
          ? metaDescription(homes)
          : `Choose Ivy Cleans for superior house cleaning in ${name} ${c.state}. Best-in-class home cleaning service awaits. Book your cleaning now!`,
    },

    // dump lines 17-21. `intro` (suburb.<slug>.intro) is Task 16's generated
    // per-area hero copy; falls back to the Savage template when absent.
    hero: {
      titleLines: [`${name}, ${c.state}`, 'Cleaning Services'],
      paragraphs:
        intro !== undefined
          ? [intro]
          : [
              t(
                'At Ivy Cleans, we specialize in providing exceptional house cleaning services to individuals in {city} and the surrounding areas. We understand the importance of a clean and comfortable living environment, so we are committed to providing top-notch cleaning services that meet your needs.',
                c,
              ),
              'Contact us today to book your quote.',
            ],
      ctaLabel: CTA_LABEL,
    },

    // dump lines 22-23; generated homes slot when present
    houseCleaning: {
      heading: `House Cleaning ${name} ${c.state}`,
      paragraph:
        homes !== undefined
          ? homes
          : t(
              `Do you live in ${name} {state}? You’re in luck our cleaning services span the entire {city} area. We have been providing the highest quality cleaning services for years. That being said if you want your home to be cleaner, more appealing, and tidy than ever, just give us a call and we can turn your house into a home because a clean home is a place where you can belong.`,
              c,
            ),
    },

    // dump lines 24-33; generated local slot when present
    benefits: {
      heading: `Benefits of House Cleaning ${name}`,
      paragraphs:
        local !== undefined
          ? [local]
          : [
              // Static — no city/suburb mention (dump line 25).
              'House cleaning is one of the vital aspects of health. Your home is where you spend much of your time on your own or with children, why risk sickness or infection. When you request these services you can assure yourself not only of the quality you’re going to receive but also of the depth of the services. We make sure that your home is ready to turn into a landlord, incoming homeowner, or current homeowner.',
              // Static — no city/suburb mention (dump line 26).
              'The benefits of our house cleaning really come in because the service is so comprehensive. Areas that aren’t typically cleaned are covered, wiped down, and sanitized. Ivy cleans specializes in improving the cleanliness of clients’ homes. To offer the most comprehensive service available, making sure that there isn’t a single box we leave unchecked.',
            ],
      // the benefits list (dump 27-32) and eco line (33) are gone: identical on every area page
    },

    // dump lines 35-38
    otherServices: {
      heading: 'Our Different Services',
      intro: `Other Services Offered In ${name} Include:`,
      links: [
        {
          label: `Move-Out Cleanings ${name}`,
          href: cityHref(c, '/services/move-in-move-out-cleaning'),
        },
        {
          label: `Deep Cleaning ${name}`,
          href: cityHref(c, '/services/deep-cleaning'),
        },
      ],
    },

    // the operator's own photos, or nothing
    workInAction: {
      heading: 'Our Work In Action',
      // copied so callers can't mutate the loaded doc
      images: [...(c.ops?.photos ?? [])],
    },

    // dump lines 40-42 minus the heading, which was a banned phrase
    closing: {
      heading: `Ready to book in ${name}?`,
      paragraph: t('Contact us today to discuss your deep cleaning requirements in {city}.', c),
      ctaLabel: CTA_LABEL,
    },
  }
}
