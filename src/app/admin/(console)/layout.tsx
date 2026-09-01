import { Suspense, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ADMIN_DASHBOARD } from '@/lib/admin-routes'
import { AdminNav } from '../nav'
import { IdentityChip } from '../identity-chip'
import { SignedInToast } from '../signed-in-toast'
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
   * server actions those pages call, or the pages themselves across a soft
   * navigation — a layout does not run for an action POST, and Partial
   * Rendering means it does not re-render on every route change either. Each
   * of the eight console pages carries its own guard for that reason, and
   * every server action in actions.ts/site-actions.ts/lead-actions.ts starts
   * with a guard of its own.
   */
  const user = await requireSession()

  return (
    <>
      {/*
        * Raises the sign-in success toast on arrival. Suspense-wrapped because
        * it calls useSearchParams, which Next requires a boundary around --
        * without one, a page that could otherwise be static would be forced
        * dynamic, and the build says so.
        */}
      <Suspense fallback={null}>
        <SignedInToast role={user.role} />
      </Suspense>

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

            <AdminNav role={user.role} />

            <IdentityChip user={user} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
    </>
  )
}
