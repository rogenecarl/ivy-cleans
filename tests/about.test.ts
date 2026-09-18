import { describe, expect, it } from 'vitest'
import { aboutMissing, aboutReady, buildAboutStoryPrompt, sinceLabel, validateAboutStory, type AboutFacts } from '../src/pipeline/about'
import { parseProfiles } from '../src/pipeline/admin-logic'
import { checkPhotoUpload, isCityPhotoPath, photoFileName } from '../src/pipeline/photos'

const facts: AboutFacts = {
  city: 'Houston',
  state: 'TX',
  stateName: 'Texas',
  ops: { servingSince: '2024-03', crewLead: 'Maria', crewSize: 4, homesCleaned: 340, photos: [{ path: '/photos/houston/a.jpg', alt: 'crew' }] },
  areaNames: ['Katy', 'Sugar Land', 'River Oaks'],
}

describe('about gate', () => {
  it('needs serving-since and one photo; a crew lead is optional', () => {
    expect(aboutMissing(undefined)).toEqual(['serving since', 'one photo'])
    expect(aboutMissing({ servingSince: '2024-03' })).toEqual(['one photo'])
    expect(aboutReady({ servingSince: '2023', photos: [{ path: '/photos/x/1.jpg', alt: 'x' }] })).toBe(true)
    expect(aboutReady(facts.ops)).toBe(true)
  })

  it('labels the month', () => {
    expect(sinceLabel('2024-03')).toBe('March 2024')
    expect(sinceLabel('spring 2024')).toBe('spring 2024')
    expect(sinceLabel('2023')).toBe('2023')
  })

  it('puts every fact in the prompt and nothing else', () => {
    const prompt = buildAboutStoryPrompt(facts)
    expect(prompt).toContain('since March 2024')
    expect(prompt).toContain('led by Maria')
    expect(prompt).toContain('4 people')
    expect(prompt).toContain('340 homes')
    // areas are not on the page, so the story is not told about them
    expect(prompt).not.toContain('Sugar Land')
    expect(prompt).toContain('DO NOT INVENT HOW THE BUSINESS RUNS')
  })
})

describe('validateAboutStory', () => {
  it('accepts a story that uses only the facts', () => {
    const story = {
      paragraphs: [
        'Ivy Cleans has cleaned homes in Houston since March 2024. Maria leads the crew of 4, and between them they have cleaned 340 homes across Katy, Sugar Land and River Oaks.',
        'Your home gets the same care whether it is a townhouse or a five-bedroom place near the parks.',
      ],
    }
    expect(validateAboutStory(story, facts)).toEqual({ ok: true })
  })

  it('rejects a year, a number and a name that were not given', () => {
    expect(validateAboutStory({ paragraphs: ['Founded in 2019, we clean Houston homes.'] }, facts)).toEqual({
      ok: false,
      error: 'the year 2019 is not a fact we were given',
    })
    expect(validateAboutStory({ paragraphs: ['We have cleaned 1,200 homes here.'] }, facts)).toEqual({
      ok: false,
      error: 'the number 1,200 is not a fact we were given',
    })
    expect(validateAboutStory({ paragraphs: ['Our lead Carlos knows every street.'] }, facts)).toEqual({
      ok: false,
      error: '"Carlos" is not a name we were given',
    })
  })

  it('rejects a claim about how the business runs', () => {
    for (const line of [
      'Maria walks through the house with you the first time.',
      'Maria handles the scheduling for every visit.',
      'If you would like a visit, ask for Maria.',
      'You will see the same faces every time.',
      'The areas are listed below on this page.',
    ]) {
      const verdict = validateAboutStory({ paragraphs: [line] }, facts)
      expect(verdict.ok, line).toBe(false)
    }
  })

  it('does not mistake ordinary wording for a claim', () => {
    expect(validateAboutStory({ paragraphs: ['We do steady, careful work in the homes that ask for it.'] }, facts)).toEqual({ ok: true })
  })

  it('lets through a place name the site already uses', () => {
    const story = { paragraphs: ['Maria and the crew work across the Bayou City every week.'] }
    expect(validateAboutStory(story, facts).ok).toBe(false)
    expect(validateAboutStory(story, facts, 'known as the Bayou City').ok).toBe(true)
  })

  it('bounds the length', () => {
    expect(validateAboutStory({ paragraphs: [] }, facts).ok).toBe(false)
    expect(validateAboutStory({ paragraphs: [Array(300).fill('word').join(' ')] }, facts).ok).toBe(false)
  })
})

describe('parseProfiles', () => {
  it('reads label | url lines and refuses a bad one by line number', () => {
    expect(parseProfiles('Google Business Profile | https://g.page/ivycleans\nYelp | https://yelp.com/biz/ivy')).toEqual({
      ok: true,
      profiles: [
        { label: 'Google Business Profile', url: 'https://g.page/ivycleans' },
        { label: 'Yelp', url: 'https://yelp.com/biz/ivy' },
      ],
    })
    expect(parseProfiles('Yelp | yelp.com/biz/ivy')).toEqual({ ok: false, error: 'profiles line 1: expected "label | https://..."' })
    expect(parseProfiles('')).toEqual({ ok: true, profiles: [] })
  })
})

describe('photo rules', () => {
  it('accepts a jpg with a caption and refuses the rest', () => {
    expect(checkPhotoUpload({ type: 'image/jpeg', size: 1000, count: 0, alt: 'The crew' })).toBeNull()
    expect(checkPhotoUpload({ type: 'image/gif', size: 1000, count: 0, alt: 'x' })).toMatch(/JPG, PNG and WebP/)
    expect(checkPhotoUpload({ type: 'image/png', size: 9 * 1024 * 1024, count: 0, alt: 'x' })).toMatch(/over 8 MB/)
    expect(checkPhotoUpload({ type: 'image/png', size: 10, count: 12, alt: 'x' })).toMatch(/at most 12/)
    expect(checkPhotoUpload({ type: 'image/png', size: 10, count: 0, alt: '  ' })).toMatch(/caption is required/)
  })

  it('names files safely and scopes paths to the city', () => {
    expect(photoFileName('IMG 0042 (Crew).JPG', 'image/jpeg', 1700000000000)).toBe('1700000000000-img-0042-crew.jpg')
    expect(isCityPhotoPath('houston', '/photos/houston/1-crew.jpg')).toBe(true)
    expect(isCityPhotoPath('houston', '/photos/orlando/1-crew.jpg')).toBe(false)
    expect(isCityPhotoPath('houston', '/photos/houston/../x.jpg')).toBe(false)
  })
})

describe('photo store keys', () => {
  it('maps the served path to the bucket key', async () => {
    const { photoObjectKey } = await import('../src/pipeline/photo-store')
    expect(photoObjectKey('/photos/houston/1-crew.jpg')).toBe('photos/houston/1-crew.jpg')
  })
})
