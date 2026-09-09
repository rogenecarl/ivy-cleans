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
import { loadCityFixture } from './fixtures/cities/load'
import { suburbData } from '../src/data/suburb'
import { suburbSlots } from '../src/content/slots'
import { BANNED_PHRASES } from '../src/content/quality'
import { pickOtherServices } from '../src/data/other-services'

const minneapolis = await getCity('minneapolis')
const miami = await loadCityFixture('miami')
const orlando = await getCity('orlando')

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

    test('meta description falls back to the template line when there is no generated copy', () => {
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

    test('benefits static paragraphs match the dump verbatim', () => {
      expect(data.benefits.paragraphs[0]).toBe(dumpLineContaining('one of the vital aspects of health'))
      expect(data.benefits.paragraphs[1]).toBe(
        dumpLineContaining("Ivy cleans specializes in improving the cleanliness of clients’ homes"),
      )
    })

    /*
     * Abdi's review, item 7. The bulleted list ("Reducing the number of
     * allergens…"), its intro line and the eco-friendly closing line were
     * byte-identical on every area page of every city. They are cut, not
     * templated: a benefits block is heading + paragraphs and nothing else.
     */
    test('benefits carries no list and no eco line any more', () => {
      expect(Object.keys(data.benefits).sort()).toEqual(['heading', 'paragraphs'])
      const text = JSON.stringify(data)
      expect(text).not.toContain('Reducing the number of allergens')
      expect(text).not.toContain('There are many benefits to deep cleaning')
      expect(text).not.toContain('eco-friendly cleaning products')
    })

    test('otherServices: three links, unprefixed for a live city; defaults when the area has no research', () => {
      // Savage carries no housingCharacter or conditions, so it gets the default three
      expect(data.otherServices.links).toEqual([
        { label: 'Deep Cleaning Savage', href: '/services/deep-cleaning' },
        { label: 'Standard Cleaning Savage', href: '/services/standard-cleaning' },
        { label: 'Move In / Move Out Cleaning Savage', href: '/services/move-in-move-out-cleaning' },
      ])
    })

    test('closing heading, paragraph, cta', () => {
      // The live heading — "We understand that every home in Savage is
      // unique…" — is on the banned list and is gone (item 7).
      expect(data.closing.heading).toBe('Ready to book in Savage?')
      expect(data.closing.paragraph).toBe('Contact us today to discuss your deep cleaning requirements in Minneapolis.')
      expect(data.closing.ctaLabel).toBe('Set an appointment 👈')
      expect(data.hero.ctaLabel).toBe('Set an appointment 👈')
    })

    /*
     * The gallery is OPS data now, not template data. Minneapolis keeps the
     * same five photos it has always shown, in the same live order — they are
     * that market's own before-and-afters — but they are read from its
     * document's ops block, so a different city shows its own or none.
     */
    test('workInAction gallery images, in the live gallery order', () => {
      expect(data.workInAction.heading).toBe('Our Work In Action')
      expect(data.workInAction.images.map((i) => i.path)).toEqual([
        '/images/rn_image_picker_lib_temp_d129a169-21-1.jpg',
        '/images/rn_image_picker_lib_temp_7f5a4f2b-e3-1.jpg',
        '/images/Untitled-design.png',
        '/images/Untitled-design-1-2.png',
        '/images/Untitled-design-2.png',
      ])
      /* alt text is the point of moving to {path, alt}: the old hardcoded
         gallery rendered alt="" on every image */
      for (const image of data.workInAction.images) {
        expect(image.alt.length).toBeGreaterThan(10)
      }
    })

    /*
     * The fingerprint guard. A city whose operator has not sent photos gets an
     * empty list, and WorkInAction renders nothing at all — NOT Minneapolis's
     * basement and oven on somebody else's domain.
     */
    test('a city with no ops photos gets an empty gallery, not the Minneapolis set', () => {
      expect(miami.ops?.photos).toBeUndefined()
      const gallery = suburbData(miami, { name: 'Brickell', slug: 'house-cleaning-brickell' })
      expect(gallery.workInAction.images).toEqual([])
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
      expect(data.otherServices.links).toHaveLength(3)
      for (const link of data.otherServices.links) {
        expect(link.href.startsWith('/miami/services/')).toBe(true)
        expect(link.label.endsWith(' Coconut Grove')).toBe(true)
      }
    })
  })

  /*
   * checkQuality reads generated slots only, so a banned phrase living in the
   * TEMPLATE shipped on every area page while the validator reported the
   * city clean. This sweep is the cheap version of the fix: every string
   * suburbData produces, for every area of a live and a draft city, against
   * the same list.
   */
  describe('otherServices picked by rule (15E)', () => {
    const area = (housingCharacter: string, conditions: string[] = []) => ({
      housingCharacter,
      conditions: conditions.map((condition) => ({ condition, implication: '', copySafe: true })),
    })

    test('rentals and vacation homes pull in Airbnb cleaning first', () => {
      expect(pickOtherServices(area('Five-bedroom vacation rentals near the parks, most managed for investors.'))).toEqual([
        'airbnb-cleaning',
        'deep-cleaning',
        'standard-cleaning',
      ])
    })

    test('new construction pulls in post-construction cleaning', () => {
      expect(pickOtherServices(area('The newest housing stock in the metro; new construction on former grove land.'))).toEqual([
        'post-construction-cleaning',
        'deep-cleaning',
        'standard-cleaning',
      ])
    })

    test('condos and townhomes pull in apartment cleaning, and a condition can trigger a rule too', () => {
      expect(pickOtherServices(area('Mid-century ranches.', ['Downtown high-rise condos face the lake']))).toEqual([
        'apartment-cleaning',
        'deep-cleaning',
        'standard-cleaning',
      ])
    })

    test('at most two rule picks, always three links, never a duplicate', () => {
      const picks = pickOtherServices(area('Short-term rentals beside new construction and townhomes.'))
      expect(picks).toEqual(['airbnb-cleaning', 'post-construction-cleaning', 'deep-cleaning'])
      expect(new Set(picks).size).toBe(3)
    })

    test('no research, or research that matches nothing, gives the default three', () => {
      expect(pickOtherServices(undefined)).toEqual(['deep-cleaning', 'standard-cleaning', 'move-in-move-out-cleaning'])
      expect(pickOtherServices(area('1950s ramblers on quiet streets.'))).toEqual(['deep-cleaning', 'standard-cleaning', 'move-in-move-out-cleaning'])
    })

    test('Orlando siblings do not all link the same services', () => {
      const lists = orlando.research.suburbs.map((s) => pickOtherServices(s).join(','))
      expect(new Set(lists).size).toBeGreaterThan(1)
    })
  })

  describe('template copy against the banned list', () => {
    const strings = (value: unknown): string[] =>
      typeof value === 'string'
        ? [value]
        : Array.isArray(value)
          ? value.flatMap(strings)
          : value && typeof value === 'object'
            ? Object.values(value).flatMap(strings)
            : []

    test('no area page of Minneapolis or Miami carries a banned phrase in its template copy', () => {
      for (const city of [minneapolis, miami]) {
        for (const suburb of city.research.suburbs) {
          for (const text of strings(suburbData(city, suburb))) {
            for (const phrase of BANNED_PHRASES) {
              expect(text.toLowerCase(), `${city.city} / ${suburb.name}`).not.toContain(phrase)
            }
          }
        }
      }
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

    test('suburbMeta.description is cut from the generated homes copy (item 9)', () => {
      const data = suburbData(cityWithSuburbCopy, katy)
      expect(data.suburbMeta.description).toBe(
        'Homes in Katy tend to be newer builds with tile floors and HOAs.',
      )
      expect(data.suburbMeta.description).not.toContain('Choose Ivy Cleans for superior house cleaning')
    })

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
      expect(a.benefits.paragraphs).not.toBe(b.benefits.paragraphs)
      expect(a.workInAction.images).not.toBe(b.workInAction.images)
      expect(a.otherServices.links).not.toBe(b.otherServices.links)
    })
  })
})
