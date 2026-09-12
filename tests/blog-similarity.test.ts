import { describe, expect, it } from 'vitest'
import { findDuplicate, similarity } from '../src/blog/similarity'

const grout = 'Grout lines collect soap film and mildew in a humid bathroom. Scrub them with an oxygen bleach paste and a stiff brush, then rinse. Seal the grout once it is fully dry so the next clean is easier.'
const lanai = 'A screened lanai in Orlando collects pollen, lovebugs and irrigation spray. Rinse the screens from the inside out, then wipe the frame with a mild detergent. Do it monthly through spring.'

describe('similarity', () => {
  it('is 1 for identical text and 0 for unrelated text', () => {
    expect(similarity(grout, grout)).toBe(1)
    expect(similarity(grout, lanai)).toBe(0)
  })
})

describe('findDuplicate', () => {
  const others = [{ cityKey: 'houston', slug: 'grout', title: 'Cleaning Grout in Houston', text: grout }]

  it('flags a near copy on another site', () => {
    const copy = grout.replace('humid bathroom', 'humid Orlando bathroom')
    const hit = findDuplicate('Cleaning Grout in Orlando', copy, others)
    expect(hit?.match.cityKey).toBe('houston')
    expect(hit!.score).toBeGreaterThan(0.5)
  })

  it('flags the same title even when the body differs', () => {
    expect(findDuplicate('cleaning grout in houston', lanai, others)?.score).toBe(1)
  })

  it('passes a different article', () => {
    expect(findDuplicate('Lanai Care in Orlando', lanai, others)).toBeNull()
  })
})
