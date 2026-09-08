'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isUnder, navTabsFor, type Role } from '@/lib/access'

// Header tabs. Client-only for usePathname; split out so the layout stays a server component with `metadata`.
// Hiding a tab is not security — access.ts canAccess() is, enforced in auth-server.ts.

// every tab matches by isUnder (access.ts); nothing keys off tab order
export function AdminNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const tabs = navTabsFor(role)

  return (
    <nav aria-label="Admin sections" className="flex items-center gap-1">
      {tabs.map((tab) => {
        const active = isUnder(pathname, tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-[0.85rem] font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-9 sm:px-4',
              active
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            {tab.label}
            {active && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-amber-500"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
