'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isUnder, navTabsFor, type Role } from '@/lib/access'

/*
 * The header's section tabs, laid out like peaktransport's AdminHeader: pill
 * links in the same bar as the logo, with the active one filled and carrying a
 * short accent underline.
 *
 * Client-only so it can read the current path with `usePathname`. Split out of
 * layout.tsx on purpose: the layout stays a server component so it can keep
 * `export const metadata` (a client component cannot carry it), and this is the
 * only piece that needs the hook.
 *
 * The tab list itself is NOT filtering anything security-relevant -- it is
 * just deciding what to draw. Hiding a tab here does not stop a manager from
 * typing the URL; that is src/lib/access.ts's canAccess(), enforced server-side
 * in src/lib/auth-server.ts and every server action. See src/lib/access.ts.
 */

/*
 * Every tab now matches by the same rule, because every tab now has its own
 * segment. The dashboard used to need an exact-match special case: it WAS
 * the console root, so a startsWith test lit it up on every page.
 *
 * Nothing here keys off tab ORDER -- an earlier version of this nav sliced
 * site.nav by literal index and rendered the wrong menu whenever the array
 * was reordered. Adding a section to SECTIONS in src/lib/access.ts is safe.
 *
 * Matching uses access.ts's isUnder rather than a fourth hand-rolled
 * `pathname === href || pathname.startsWith(href + '/')` -- see that file's
 * comment on isUnder for why three independent copies of this boundary test
 * is already one too many.
 */
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
