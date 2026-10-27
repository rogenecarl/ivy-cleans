import type { CityContent } from '@/server/content/types'
import { realAddress } from '@/server/content/interpolate'

// A city's stored embed when it has one (Minneapolis), else a Google embed of its street address, else none.
export function mapSrc(c: CityContent, which: 'front' | 'home' | 'contact'): string | null {
  const stored = c.maps[which]
  if (stored !== null && stored !== '') return stored
  const address = realAddress(c.contactAddress ?? c.address)
  if (address === undefined) return null
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
}
