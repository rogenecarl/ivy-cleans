import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ADMIN_DASHBOARD } from '@/lib/admin-routes'
import { AdminNav } from '../nav'
import { Toaster } from '@/components/ui/sonner'
import { requireSession } from '@/lib/auth-server'

/*
 * The signed-in console's shell. Everything under this layout requires a
 * session; /admin/login deliberately sits outside it.
 *
 * Async so it can call the guard below. The only piece that needs the current
 * path to light up the active tab is split into the small client component
 * `AdminNav`.
 */
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  /*
   * Every console page is behind this. It is NOT, however, what protects the
   * server actions those pages call — a layout does not run for an action
   * POST. Each action gets its own guard in the next task; today they are
   * still open, see the AUTH GOES HERE markers in site-actions.ts and
   * lead-actions.ts.
   */
  const user = await requireSession()

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
             * Matches peaktransport's header chip, by request. Task 9 wires
             * this to the real session (name + role); peaktransport's version
             * drops a menu with Settings and Sign Out off the same chip, and
             * this console's own <Link>/form for that lands in Task 12, which
             * is also where AdminNav starts taking `role` to filter tabs.
             */}
            <div className="ml-auto flex shrink-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full bg-muted text-[0.7rem] font-semibold text-muted-foreground ring-2 ring-border"
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[0.8rem] leading-tight font-medium">{user.name}</span>
                <span className="block text-[0.7rem] leading-tight text-muted-foreground capitalize">
                  {user.role}
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
