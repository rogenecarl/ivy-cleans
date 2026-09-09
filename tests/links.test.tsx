import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Linked from '@/components/Linked'
import { MAX_SUBURB_LINKS, acceptLinks, linkify, slotLinks } from '@/content/links'
import { validateCityContent } from '@/content/validate'
import { suburbSlots } from '@/content/slots'
import { suburbData } from '@/data/suburb'
import { getCity } from '@/content/store'
import { loadCityFixture } from './fixtures/cities/load'

const minneapolis = await getCity('minneapolis')
const miami = await loadCityFixture('miami')

const text = 'Heathrow homes need gate authorization, and a move-out clean there takes most of a day.'

describe('acceptLinks', () => {
  it('keeps a phrase only when it sits verbatim in its slot', () => {
    const out = acceptLinks(
      [
        { slot: 'a', anchor: 'a move-out clean there', href: '/services/move-in-move-out-cleaning' },
        { slot: 'a', anchor: 'a move out clean there', href: '/services/deep-cleaning' },
        { slot: 'b', anchor: 'a move-out clean there', href: '/services/standard-cleaning' },
      ],
      { a: text },
      MAX_SUBURB_LINKS,
    )
    expect(out).toEqual({ a: [{ anchor: 'a move-out clean there', href: '/services/move-in-move-out-cleaning' }] })
  })

  it('needs at least three words and at most sixty characters', () => {
    const long = 'x'.repeat(61)
    const out = acceptLinks(
      [
        { slot: 'a', anchor: 'Heathrow homes', href: '/services/deep-cleaning' },
        { slot: 'a', anchor: long, href: '/services/standard-cleaning' },
      ],
      { a: `${text} ${long}` },
      3,
    )
    expect(out).toEqual({})
  })

  it('one link per target and per anchor, first wins, capped', () => {
    const out = acceptLinks(
      [
        { slot: 'a', anchor: 'Heathrow homes need gate', href: '/services/deep-cleaning' },
        { slot: 'a', anchor: 'a move-out clean there', href: '/services/deep-cleaning' },
        { slot: 'a', anchor: 'heathrow homes need gate', href: '/services/standard-cleaning' },
        { slot: 'a', anchor: 'takes most of a day', href: '/services/standard-cleaning' },
        { slot: 'a', anchor: 'need gate authorization, and', href: '/services/airbnb-cleaning' },
      ],
      { a: text },
      2,
    )
    expect(out.a.map((l) => l.href)).toEqual(['/services/deep-cleaning', '/services/standard-cleaning'])
  })
})

describe('linkify + <Linked>', () => {
  const links = [
    { anchor: 'a move-out clean there', href: '/services/move-in-move-out-cleaning' },
    { anchor: 'Heathrow homes need gate authorization', href: '/services/deep-cleaning' },
  ]

  it('splits around the first occurrence of each anchor, in text order', () => {
    expect(linkify(text, links)).toEqual([
      { text: 'Heathrow homes need gate authorization', href: '/services/deep-cleaning' },
      ', and ',
      { text: 'a move-out clean there', href: '/services/move-in-move-out-cleaning' },
      ' takes most of a day.',
    ])
  })

  it('ignores an anchor that is not in the text and overlapping anchors', () => {
    expect(linkify(text, [{ anchor: 'nowhere', href: '/x' }, ...links, { anchor: 'gate authorization, and a', href: '/y' }])).toHaveLength(4)
  })

  it('renders anchors as links and plain text untouched', () => {
    const html = renderToStaticMarkup(<Linked text={text} links={links} />)
    expect(html).toContain('href="/services/deep-cleaning"')
    expect(html).toContain('>a move-out clean there</a>')
    expect(renderToStaticMarkup(<Linked text={text} />)).toBe(text)
  })
})

describe('links on the page', () => {
  const katy = { name: 'Katy', slug: 'katy' }
  const [introSlot, homesSlot] = suburbSlots(katy.slug)
  const city = {
    ...miami,
    sections: {
      ...miami.sections,
      [introSlot]: 'We clean homes in Katy, and a deep clean before the pollen season is the usual first booking.',
      [homesSlot]: 'Homes in Katy tend to be newer builds with tile floors.',
    },
    links: { [introSlot]: [{ anchor: 'a deep clean before the pollen season', href: '/services/deep-cleaning' }] },
  }

  it('suburbData carries each slot’s links with hrefs pointed at the tenant', () => {
    const data = suburbData(city, katy)
    expect(data.hero.links).toEqual([{ anchor: 'a deep clean before the pollen season', href: '/miami/services/deep-cleaning' }])
    expect(data.houseCleaning.links).toEqual([])
    expect(slotLinks(minneapolis, introSlot)).toEqual([])
  })

  it('validateCityContent refuses an anchor that is not in the copy, or an href that leaves the site', () => {
    expect(() => validateCityContent(city)).not.toThrow()
    expect(() =>
      validateCityContent({ ...city, links: { [introSlot]: [{ anchor: 'not in the copy at all', href: '/services/deep-cleaning' }] } }),
    ).toThrow(/not in the copy verbatim/)
    expect(() =>
      validateCityContent({ ...city, links: { [introSlot]: [{ anchor: 'a deep clean before the pollen season', href: 'https://ivycleans.com/deep-cleaning-minneapolis/' }] } }),
    ).toThrow(/no link may leave the tenant/)
    expect(() => validateCityContent({ ...city, links: { 'suburb.nowhere.intro': [] } })).toThrow(/no string section/)
  })
})
