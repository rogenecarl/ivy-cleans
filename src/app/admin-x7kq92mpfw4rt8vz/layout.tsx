import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ADMIN_BASE } from './base'
import { AdminNav } from './nav'
import { Badge } from '@/components/ui/badge'
import { Toaster } from '@/components/ui/sonner'
import './admin.css'

/*
 * The operator console's shell. NO site chrome and no fidelity components:
 * this route sits outside (sites)/[city] precisely so it can never contribute
 * a byte to a customer page, and importing a site component would tie the two
 * together again through the shared CSS scan.
 *
 * `data-admin-root` is the hook admin.css uses to reset the root font-size
 * ladder for these pages, and the hook the shadcn base-layer resets in
 * admin.css key off — see the comments there.
 *
 * Stays a server component (no 'use client') so it can export `metadata`.
 * The only piece that needs the current path to light up the active tab is
 * split into the small client component `AdminNav`.
 */

export const metadata: Metadata = {
  title: 'Ivy Cleans: Site Manager',
  // Belt and braces on top of the unguessable URL: nothing here should ever
  // reach an index, and the admin is linked from no public page.
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div data-admin-root className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[64rem] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href={ADMIN_BASE}
            className="rounded-sm text-[1.05rem] font-semibold tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Ivy Cleans: Site Manager
          </Link>
          <Badge variant="secondary" className="shrink-0">
            internal
          </Badge>
        </div>
      </header>
      <AdminNav />
      <main className="mx-auto max-w-[64rem] px-4 py-8 sm:px-6">{children}</main>
      <Toaster />
    </div>
  )
}
