/*
 * Pins the exported VALUES of bookData(minneapolis), same convention as
 * data-equivalence.test.ts. This is a NEW pin (round 2b, task 3) — book.ts
 * only just became a city-dependent builder, so unlike the plan-1 pins in
 * tests/__snapshots__/data-equivalence.test.ts.snap there is no prior
 * hardcoded-module snapshot to reconcile against. First run writes the
 * snapshot; subsequent runs must stay stable.
 */
import { describe, expect, test } from 'vitest'
import { getDefaultCity } from '../src/content/store'
import { bookData } from '../src/data/book'

const c = await getDefaultCity()

describe('bookData(minneapolis) is stable', () => {
  test('book', () => {
    expect(JSON.parse(JSON.stringify(bookData(c)))).toMatchSnapshot()
  })
})
