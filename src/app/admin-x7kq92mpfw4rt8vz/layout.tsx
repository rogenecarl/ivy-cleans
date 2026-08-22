import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ADMIN_BASE } from './base'
import { AdminNav } from './nav'
import { Toaster } from '@/components/ui/sonner'
import './admin.css'

/*
 * The operator console's shell, laid out after peaktransport's AdminHeader:
 * one sticky bar holding the logo, the section tabs and an identity chip, over
 * a wide (max-w-7xl) content column.
 *
 * NO site chrome and no fidelity components: this route sits outside
 * (sites)/[city] precisely so it can never contribute a byte to a customer
 * page, and importing a site component would tie the two together again
 * through the shared CSS scan. The logo is the raw asset from public/, not the
 * site's <TopBar>, for exactly that reason.
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
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="flex h-16 items-center gap-4 sm:gap-8">
            <Link
              href={ADMIN_BASE}
              className="shrink-0 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {/* Logo.png is the dark-on-light mark the inner site's header
                * uses, which is the right one for this white bar --
                * Logo-footer.png is the reversed variant for dark grounds. */}
              <Image
                src="/images/Logo.png"
                alt="Ivy Cleans"
                width={309}
                height={149}
                className="h-9 w-auto"
                priority
              />
            </Link>

            <AdminNav />

            {/*
             * peaktransport puts a signed-in user and a sign-out here. This
             * console has NO authentication at all -- the unguessable URL is
             * the only access control (see resolve-rewrite.ts) -- so rendering
             * a user identity or a Sign Out control would be pure decoration
             * claiming a security property that does not exist. This chip says
             * what is actually true instead.
             */}
            <div className="ml-auto flex shrink-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full bg-muted text-[0.7rem] font-semibold text-muted-foreground ring-2 ring-border"
              >
                IC
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[0.8rem] leading-tight font-medium">Site Manager</span>
                <span className="block text-[0.7rem] leading-tight text-muted-foreground">
                  Internal
                </span>
              </span>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      <Toaster />
    </div>
  )
}
