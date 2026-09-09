import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import JsonLd from '@/components/JsonLd'
import { mapSrc } from '@/data/maps'
import { BUSINESS_ID, localBusinessJsonLd, serviceJsonLd } from '@/data/structured-data'
import { serviceBySlug } from '@/data/services/registry'
import { getCity } from '@/content/store'

const minneapolis = await getCity('minneapolis')
const orlando = await getCity('orlando')
const withAddress = { ...orlando, address: '123 Orange Ave, Orlando, FL 32801', contactAddress: undefined }

describe('mapSrc', () => {
  it('keeps a stored embed', () => {
    expect(mapSrc(minneapolis, 'home')).toBe(minneapolis.maps.home)
  })
  it('embeds the street address when there is no stored map', () => {
    expect(orlando.maps.front).toBeNull()
    expect(mapSrc(withAddress, 'front')).toBe(
      'https://www.google.com/maps?q=123%20Orange%20Ave%2C%20Orlando%2C%20FL%2032801&output=embed',
    )
  })
  it('is null while the address is the placeholder', () => {
    expect(orlando.address.endsWith('address pending')).toBe(true)
    expect(mapSrc(orlando, 'front')).toBeNull()
    expect(mapSrc(orlando, 'contact')).toBeNull()
  })
})

describe('localBusinessJsonLd', () => {
  it('is null without a real address', () => {
    expect(localBusinessJsonLd(orlando)).toBeNull()
  })
  it('carries name, phone, address and every area, from the city fields', () => {
    const node = localBusinessJsonLd(withAddress)!
    expect(node['@type']).toBe('LocalBusiness')
    expect(node['@id']).toBe(BUSINESS_ID)
    expect(node.name).toBe('Ivy Cleans')
    expect(node.telephone).toBe(orlando.phoneHref.replace(/^tel:\s*/, ''))
    expect(node.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '123 Orange Ave, Orlando, FL 32801',
      addressLocality: 'Orlando',
      addressRegion: 'FL',
      addressCountry: 'US',
    })
    expect((node.areaServed as { name: string }[]).map((a) => a.name)).toEqual(orlando.research.suburbs.map((s) => s.name))
    expect(node.review).toBeUndefined()
  })
  it('adds reviews, photos and founding date only when the ops block has them', () => {
    const node = localBusinessJsonLd({
      ...withAddress,
      ops: {
        servingSince: '2024-03',
        photos: [{ path: '/images/a.jpg', alt: 'a' }],
        reviews: [{ quote: 'Spotless.', firstName: 'Dan', area: 'Lake Mary', date: '2025-06' }],
      },
    })!
    expect(node.foundingDate).toBe('2024-03')
    expect(node.image).toEqual(['/images/a.jpg'])
    expect(node.review).toEqual([
      { '@type': 'Review', reviewBody: 'Spotless.', author: { '@type': 'Person', name: 'Dan' }, datePublished: '2025-06' },
    ])
  })
})

describe('serviceJsonLd', () => {
  const deep = serviceBySlug('deep-cleaning')!
  it('points at the business node when the city has one', () => {
    const node = serviceJsonLd(withAddress, deep)
    expect(node['@type']).toBe('Service')
    expect(node.name).toBe('Deep Cleaning')
    expect(node.areaServed).toEqual({ '@type': 'City', name: 'Orlando' })
    expect(node.provider).toEqual({ '@id': BUSINESS_ID })
  })
  it('names the business inline when there is no address yet', () => {
    expect(serviceJsonLd(orlando, deep).provider).toEqual({
      '@type': 'LocalBusiness',
      name: 'Ivy Cleans',
      telephone: orlando.phoneHref.replace(/^tel:\s*/, ''),
    })
  })
})

describe('<JsonLd>', () => {
  it('renders nothing for null and escapes < in a field', () => {
    expect(renderToStaticMarkup(<JsonLd data={null} />)).toBe('')
    const html = renderToStaticMarkup(<JsonLd data={{ name: 'x</script><b>' }} />)
    expect(html.match(/<\/script>/g)?.length).toBe(1)
    expect(html).toContain('application/ld+json')
  })
})
