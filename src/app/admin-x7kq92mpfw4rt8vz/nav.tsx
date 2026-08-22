'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ADMIN_BASE, ADMIN_LEADS, ADMIN_SITES } from './base'

/*
 * The header's section tabs, laid out like peaktransport's AdminHeader: pill
 * links in the same bar as the logo, with the active one filled and carrying a
 * short accent underline.
 *
 * Client-only so it can read the current path with `usePathname`. Split out of
 * layout.tsx on purpose: the layout stays a server component so it can keep
 * `export const metadata` (a client component cannot carry it), and this is the
 * only piece that needs the hook.
 */

const TABS = [
  { href: ADMIN_BASE, label: 'Dashboard' },
  { href: ADMIN_LEADS, label: 'Leads' },
  { href: ADMIN_SITES, label: 'Sites' },
] as const

/*
 * Dashboard is the admin ROOT, so a `startsWith` test would light it up on
 * every page in the console. It alone matches exactly; the other two also
 * match their sub-routes, so /leads/<id> keeps Leads lit and
 * /sites/<key> keeps Sites lit.
 *
 * Nothing here keys off tab ORDER -- an earlier version of this nav sliced
 * site.nav by literal index and rendered the wrong menu whenever the array
 * was reordered. Adding a tab to TABS is safe.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === ADMIN_BASE) return pathname === ADMIN_BASE
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Admin sections" className="flex items-center gap-1">
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href)
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
