import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ADMIN_DASHBOARD } from '@/lib/admin-routes'
import { AdminNav } from '../nav'
import { Toaster } from '@/components/ui/sonner'

/*
 * The signed-in console's shell. Everything under this layout requires a
 * session; /admin/login deliberately sits outside it. Task 9 adds the
 * requireSession() call at the top of this component.
 *
 * Stays a server component (no 'use client') so it can call the async guard.
 * The only piece that needs the current path to light up the active tab is
 * split into the small client component `AdminNav`.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="flex h-16 items-center gap-4 sm:gap-8">
            <Link
              href={ADMIN_DASHBOARD}
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
             * Matches peaktransport's header chip, by request.
             *
             * NOTE FOR WHOEVER READS THIS NEXT: "Admin / Administrator" is a
             * LABEL, not an account. This console has no authentication at
             * all -- the unguessable URL is the only access control (see
             * resolve-rewrite.ts) -- so there is no user to be signed in as
             * and nothing here reflects a session. Deliberately static for
             * that reason: peaktransport's version drops a menu with Settings
             * and Sign Out, and a Sign Out that ends no session would be
             * worse than none at all.
             */}
            <div className="ml-auto flex shrink-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full bg-muted text-[0.7rem] font-semibold text-muted-foreground ring-2 ring-border"
              >
                A
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[0.8rem] leading-tight font-medium">Admin</span>
                <span className="block text-[0.7rem] leading-tight text-muted-foreground">
                  Administrator
                </span>
              </span>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      <Toaster />
    </>
  )
}
