'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { siteFilterHref, type SiteQuery } from './list-logic'

// Search kept in the URL: the table is a server component, and a search stays bookmarkable. router.replace
// (not push) so keystrokes don't stack history; scroll: false; debounced.
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
