'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ADMIN_BASE } from './base'

/*
 * Client-only so it can read the current path with `usePathname` and light
 * up the active tab. Split out of layout.tsx on purpose: the layout itself
 * stays a server component so it can keep `export const metadata` (a client
 * component cannot carry it), and this is the only piece that needs the hook.
 */

const LEADS_HREF = `${ADMIN_BASE}/leads`

const TABS = [
  { href: ADMIN_BASE, label: 'Sites' },
  { href: LEADS_HREF, label: 'Leads' },
] as const

export function AdminNav() {
  const pathname = usePathname()
  const onLeads = pathname === LEADS_HREF || pathname.startsWith(`${LEADS_HREF}/`)

  return (
    <nav aria-label="Admin sections" className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[64rem] gap-6 px-4 sm:px-6">
        {TABS.map((tab) => {
          const active = tab.href === LEADS_HREF ? onLeads : !onLeads
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-[44px] cursor-pointer items-center border-b-2 border-transparent px-1 text-[0.9rem] font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                active && 'border-primary text-foreground'
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
