'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { siteFilterHref, type SiteQuery } from './list-logic'

/*
 * Search, kept in the URL rather than in client state.
 *
 * The table itself stays a SERVER component -- it computes each row's domain,
 * lead counts and readiness -- so filtering has to happen server-side, which
 * means the term has to reach the server. Putting it in the URL also makes a
 * search bookmarkable and the back button work, matching how every other
 * filter on both list screens behaves.
 *
 * router.replace, not push: typing eight characters would otherwise push
 * eight history entries and the back button would walk back through them one
 * keystroke at a time. scroll: false so the page does not jump to the top on
 * every keystroke.
 *
 * Debounced because each change is a server round trip, and `value` is local
 * state so the input stays responsive while that is in flight.
 */
export function SiteSearch({ query }: { query: SiteQuery }) {
  const router = useRouter()
  const [value, setValue] = useState(query.q)

  useEffect(() => {
    if (value === query.q) return
    const id = setTimeout(() => {
      router.replace(siteFilterHref(query, 'q', value.trim()), { scroll: false })
    }, 300)
    return () => clearTimeout(id)
  }, [value, query, router])

  return (
    <div className="relative w-full sm:w-64">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search city, key or domain"
        aria-label="Search sites"
        className="pl-9"
      />
    </div>
  )
}
