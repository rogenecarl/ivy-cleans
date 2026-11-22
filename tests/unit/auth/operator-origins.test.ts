import { describe, expect, it } from 'vitest'
import { OPERATOR_ORIGINS } from '@/server/content/resolve-rewrite'

describe('OPERATOR_ORIGINS', () => {
  it('lets the operator sign in on the brand domain and on the vercel.app host', () => {
    expect(OPERATOR_ORIGINS).toEqual(
      expect.arrayContaining(['https://www.ivycleans.com', 'https://ivycleans.com', 'https://ivycleans.vercel.app']),
    )
  })
})
