/*
 * suburbData is a pure token-substitution builder (Task 1 of the suburb-pages
 * plan): the template copy is byte-verbatim from
 * docs/superpowers/reference/ivycleans-live/suburb-savage-content-dump.txt,
 * with only the {suburb}/{ST}/{city}/{citySlug} tokens spliced in per call.
 * These tests pin that byte-equality against the live Savage reference and
 * exercise the cityHref draft-preview prefixing via a draft city (Miami).
 */
import { describe, expect, test } from 'vitest'
import { readFile } from 'fs/promises'
import path from 'path'
import { getCity } from '../src/content/store'
import { suburbData } from '../src/data/suburb'
import { suburbSlots } from '../src/content/slots'

const minneapolis = await getCity('minneapolis')
const miami = await getCity('miami')

const dumpPath = path.join(
  process.cwd(),
  'docs/superpowers/reference/ivycleans-live/suburb-savage-content-dump.txt',
)
const dumpLines = (await readFile(dumpPath, 'utf-8')).split('\n')

function dumpLineContaining(needle: string): string {
  const line = dumpLines.find((l) => l.includes(needle))
  if (line === undefined) throw new Error(`dump line containing ${JSON.stringify(needle)} not found`)
  return line
}

describe('suburbData', () => {
  describe('Savage (live city) byte-equality against the content dump', () => {
    const savage = { name: 'Savage', slug: 'cleaning-service-savage-mn' }
    const data = suburbData(minneapolis, savage)

    test('meta title', () => {
      expect(data.suburbMeta.title).toBe('House Cleaning Service In Savage, MN')
    })

    test('meta description', () => {
      expect(data.suburbMeta.description).toBe(
        'Choose Ivy Cleans for superior house cleaning in Savage MN. Best-in-class home cleaning service awaits. Book your cleaning now!',
      )
    })

    test('hero title lines', () => {
      expect(data.hero.titleLines).toEqual(['Savage, MN', 'Cleaning Services'])
    })

    test('houseCleaning heading', () => {
      expect(data.houseCleaning.heading).toBe('House Cleaning Savage MN')
    })

    test('houseCleaning paragraph matches the dump line verbatim', () => {
      const dumpLine = dumpLineContaining('Do you live in Savage MN?')
      expect(data.houseCleaning.paragraph).toBe(dumpLine)
    })

    test('benefits listIntro contains the metro city', () => {
      expect(data.benefits.listIntro).toContain('in Minneapolis')
      expect(data.benefits.listIntro).toBe(
        'There are many benefits to deep cleaning your home in Minneapolis, including:',
      )
    })

    test('benefits static paragraphs match the dump verbatim', () => {
      expect(data.benefits.paragraphs[0]).toBe(dumpLineContaining('one of the vital aspects of health'))
      expect(data.benefits.paragraphs[1]).toBe(
        dumpLineContaining("Ivy cleans specializes in improving the cleanliness of clients’ homes"),
      )
    })

    test('benefits items match the dump verbatim, in order', () => {
      expect(data.benefits.items).toEqual([
        'Reducing the number of allergens in your home',
        'Improving indoor air quality',
        'Preventing the spread of germs and bacteria',
        'Removing stubborn stains and dirt buildup',
        'Creating a more comfortable living environment',
      ])
    })

    test('otherServices hrefs and labels (live city: unprefixed)', () => {
      expect(data.otherServices.links).toEqual([
        { label: 'Move-Out Cleanings Savage', href: '/services/move-in-move-out-cleaning' },
        { label: 'Deep Cleaning Savage', href: '/services/deep-cleaning' },
      ])
    })

    test('closing heading, paragraph, cta', () => {
      expect(data.closing.heading).toBe(
        'We understand that every home in Savage is unique, which is why we offer customized cleaning services to meet your specific needs.',
      )
      expect(data.closing.paragraph).toBe('Contact us today to discuss your deep cleaning requirements in Minneapolis.')
      expect(data.closing.ctaLabel).toBe('Set an appointment 👈')
      expect(data.hero.ctaLabel).toBe('Set an appointment 👈')
    })

    test('workInAction gallery images, in the live gallery order', () => {
      expect(data.workInAction.heading).toBe('Our Work In Action')
      expect(data.workInAction.images).toEqual([
        '/images/rn_image_picker_lib_temp_d129a169-21-1.jpg',
        '/images/rn_image_picker_lib_temp_7f5a4f2b-e3-1.jpg',
        '/images/Untitled-design.png',
        '/images/Untitled-design-1-2.png',
        '/images/Untitled-design-2.png',
      ])
    })
  })

  describe('token behavior for a draft city (Miami)', () => {
    const coconutGrove = { name: 'Coconut Grove', slug: 'house-cleaning-coconut-grove' }
    const data = suburbData(miami, coconutGrove)

    test('meta title uses the draft city state', () => {
      expect(data.suburbMeta.title).toBe('House Cleaning Service In Coconut Grove, FL')
    })

    test('houseCleaning paragraph interpolates suburb, state, and metro', () => {
      expect(data.houseCleaning.paragraph).toContain('Do you live in Coconut Grove FL?')
      expect(data.houseCleaning.paragraph).toContain('the entire Miami area')
    })

    test('otherServices links carry the draft-preview prefix via cityHref', () => {
      expect(data.otherServices.links).toEqual([
        { label: 'Move-Out Cleanings Coconut Grove', href: '/miami/services/move-in-move-out-cleaning' },
        { label: 'Deep Cleaning Coconut Grove', href: '/miami/services/deep-cleaning' },
      ])
    })
  })

  describe('generated per-area copy (Task 17)', () => {
    const katy = { name: 'Katy', slug: 'katy' }
    const [introSlot, homesSlot, localSlot] = suburbSlots(katy.slug)

    test('suburbSlots ids match the cross-task contract exactly', () => {
      expect(suburbSlots('katy')).toEqual(['suburb.katy.intro', 'suburb.katy.homes', 'suburb.katy.local'])
      expect(introSlot).toBe('suburb.katy.intro')
      expect(homesSlot).toBe('suburb.katy.homes')
      expect(localSlot).toBe('suburb.katy.local')
    })

    const cityWithSuburbCopy = {
      ...miami,
      sections: {
        ...miami.sections,
        [introSlot]: 'Katy homeowners know us for the developments near Cinco Ranch.',
        [homesSlot]: 'Homes in Katy tend to be newer builds with tile floors and HOAs.',
        [localSlot]: 'Katy summers bring dust and pollen that settle fast on floors here.',
      },
    }

    test('hero.paragraphs renders the generated intro, not the Savage template', () => {
      const data = suburbData(cityWithSuburbCopy, katy)
      expect(data.hero.paragraphs).toEqual(['Katy homeowners know us for the developments near Cinco Ranch.'])
      expect(data.hero.paragraphs.join(' ')).not.toContain('exceptional house cleaning services')
    })

    test('houseCleaning.paragraph renders the generated homes text, not the "You’re in luck" template', () => {
      const data = suburbData(cityWithSuburbCopy, katy)
      expect(data.houseCleaning.paragraph).toBe('Homes in Katy tend to be newer builds with tile floors and HOAs.')
      expect(data.houseCleaning.paragraph).not.toContain('You’re in luck')
    })

    test('benefits.paragraphs renders the generated local text, not the static template', () => {
      const data = suburbData(cityWithSuburbCopy, katy)
      expect(data.benefits.paragraphs).toEqual(['Katy summers bring dust and pollen that settle fast on floors here.'])
      expect(data.benefits.paragraphs.join(' ')).not.toContain('vital aspects of health')
    })

    const cityWithBlankSuburbCopy = {
      ...miami,
      sections: {
        ...miami.sections,
        // A model can return "" for a slot (SuburbCopySchema has no
        // min-length constraint) — sOpt must treat that as absent, not as
        // real copy, so the page renders the template instead of an empty
        // paragraph.
        [introSlot]: '',
        [homesSlot]: '   ',
        [localSlot]: 'Katy summers bring dust and pollen that settle fast on floors here.',
      },
    }

    test('a blank ("" or whitespace-only) slot falls back to the template, not an empty paragraph', () => {
      const data = suburbData(cityWithBlankSuburbCopy, katy)
      expect(data.hero.paragraphs.join(' ')).toContain('exceptional house cleaning services')
      expect(data.houseCleaning.paragraph).toContain('You’re in luck')
      // A non-blank slot alongside blank ones still renders as generated.
      expect(data.benefits.paragraphs).toEqual(['Katy summers bring dust and pollen that settle fast on floors here.'])
    })

    test('with NO generated copy, all three fall back to the template and nothing throws (protects the 24 live Minneapolis pages)', () => {
      const savage = { name: 'Savage', slug: 'cleaning-service-savage-mn' }
      expect(() => suburbData(minneapolis, savage)).not.toThrow()
      const data = suburbData(minneapolis, savage)
      expect(data.hero.paragraphs.length).toBeGreaterThan(0)
      expect(data.houseCleaning.paragraph).toContain('You’re in luck')
      expect(data.benefits.paragraphs.length).toBeGreaterThan(0)
      expect(data.benefits.paragraphs[0]).toContain('vital aspects of health')
    })
  })

  describe('purity', () => {
    test('two calls with the same args return deeply-equal, independent objects', () => {
      const savage = { name: 'Savage', slug: 'cleaning-service-savage-mn' }
      const a = suburbData(minneapolis, savage)
      const b = suburbData(minneapolis, savage)
      expect(a).toEqual(b)
      expect(a).not.toBe(b)
      expect(a.benefits.items).not.toBe(b.benefits.items)
      expect(a.workInAction.images).not.toBe(b.workInAction.images)
      expect(a.otherServices.links).not.toBe(b.otherServices.links)
    })
  })
})
