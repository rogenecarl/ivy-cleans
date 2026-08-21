// Verbatim copy from
// docs/superpowers/reference/ivycleans-live/suburb-savage-content-dump.txt
// (elementor page id 664, the live /cleaning-service-savage-mn/ page) plus
// the <title>/meta-description pair read directly from suburb-savage.html
// (the dump has no head tags). Typos and ’ (U+2019) apostrophes are
// preserved exactly as on the live site.
//
// Tokens: {suburb} is the suburb's display name; {ST} is the metro city's
// two-letter state code (Savage's own state, since a suburb always sits in
// its metro's state); {city}/{citySlug} come from the metro CityContent via
// t(). Every literal below traces to a specific dump line — see the inline
// citations. No AI-class slots: this page is pure token substitution.
//
// Unlike deep-cleaning.ts / move-out.ts, this builder takes a second
// argument (the suburb ref) because the page repeats per-suburb, not once
// per city — SuburbRef is never stored on CityContent itself, callers pass
// one entry from c.research.suburbs.

import type { CityContent } from '../content/types'
import { cityHref, t } from '../content/interpolate'

export type SuburbRef = { name: string; slug: string }

export type SuburbData = {
  suburbMeta: { title: string; description: string }
  hero: { titleLines: [string, string]; paragraphs: string[]; ctaLabel: string }
  houseCleaning: { heading: string; paragraph: string }
  benefits: { heading: string; paragraphs: string[]; listIntro: string; items: string[]; closing: string }
  otherServices: { heading: string; intro: string; links: { label: string; href: string }[] }
  workInAction: { heading: string; images: string[] }
  closing: { heading: string; paragraph: string; ctaLabel: string }
}

const CTA_LABEL = 'Set an appointment 👈' // dump lines 21, 34, 42

export function suburbData(c: CityContent, suburb: SuburbRef): SuburbData {
  const { name } = suburb

  return {
    // <title> / meta description read from suburb-savage.html (not in the
    // plain-text dump). Note the title has a comma before {ST}; the
    // description does not — reproduced as on the live page.
    suburbMeta: {
      title: `House Cleaning Service In ${name}, ${c.state}`,
      description: `Choose Ivy Cleans for superior house cleaning in ${name} ${c.state}. Best-in-class home cleaning service awaits. Book your cleaning now!`,
    },

    // dump lines 17-21
    hero: {
      titleLines: [`${name}, ${c.state}`, 'Cleaning Services'],
      paragraphs: [
        t(
          'At Ivy Cleans, we specialize in providing exceptional house cleaning services to individuals in {city} and the surrounding areas. We understand the importance of a clean and comfortable living environment, so we are committed to providing top-notch cleaning services that meet your needs.',
          c,
        ),
        'Contact us today to book your quote.',
      ],
      ctaLabel: CTA_LABEL,
    },

    // dump lines 22-23
    houseCleaning: {
      heading: `House Cleaning ${name} ${c.state}`,
      paragraph: t(
        `Do you live in ${name} {state}? You’re in luck our cleaning services span the entire {city} area. We have been providing the highest quality cleaning services for years. That being said if you want your home to be cleaner, more appealing, and tidy than ever, just give us a call and we can turn your house into a home because a clean home is a place where you can belong.`,
        c,
      ),
    },

    // dump lines 24-33
    benefits: {
      heading: `Benefits of House Cleaning ${name}`,
      paragraphs: [
        // Static — no city/suburb mention (dump line 25).
        'House cleaning is one of the vital aspects of health. Your home is where you spend much of your time on your own or with children, why risk sickness or infection. When you request these services you can assure yourself not only of the quality you’re going to receive but also of the depth of the services. We make sure that your home is ready to turn into a landlord, incoming homeowner, or current homeowner.',
        // Static — no city/suburb mention (dump line 26).
        'The benefits of our house cleaning really come in because the service is so comprehensive. Areas that aren’t typically cleaned are covered, wiped down, and sanitized. Ivy cleans specializes in improving the cleanliness of clients’ homes. To offer the most comprehensive service available, making sure that there isn’t a single box we leave unchecked.',
      ],
      listIntro: t('There are many benefits to deep cleaning your home in {city}, including:', c),
      items: [
        'Reducing the number of allergens in your home',
        'Improving indoor air quality',
        'Preventing the spread of germs and bacteria',
        'Removing stubborn stains and dirt buildup',
        'Creating a more comfortable living environment',
      ],
      // Static — no city/suburb mention (dump line 33).
      closing:
        'At Ivy Cleans, we use eco-friendly cleaning products and techniques to ensure that your home is not only clean but also safe for you, your family, and your pets. It is important to us that you’re as comfortable as possible in your freshly cleaned home.',
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

    // dump line 39. Gallery order/images match the live swiper carousel
    // (elementor-element-777c3582): rn_image_picker_lib_temp_d129a169-21-1.jpg,
    // rn_image_picker_lib_temp_7f5a4f2b-e3-1.jpg, Untitled-design.png,
    // Untitled-design-1-2.png, Untitled-design-2.png — same on every suburb
    // page (the carousel isn't per-suburb content on the live site).
    workInAction: {
      heading: 'Our Work In Action',
      images: [
        '/images/rn_image_picker_lib_temp_d129a169-21-1.jpg',
        '/images/rn_image_picker_lib_temp_7f5a4f2b-e3-1.jpg',
        '/images/Untitled-design.png',
        '/images/Untitled-design-1-2.png',
        '/images/Untitled-design-2.png',
      ],
    },

    // dump lines 40-42
    closing: {
      heading: `We understand that every home in ${name} is unique, which is why we offer customized cleaning services to meet your specific needs.`,
      paragraph: t('Contact us today to discuss your deep cleaning requirements in {city}.', c),
      ctaLabel: CTA_LABEL,
    },
  }
}
