import { Suspense, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ADMIN_DASHBOARD } from '@/lib/admin-routes'
import { AdminNav } from '../nav'
import { IdentityChip } from '../identity-chip'
import { SignedInToast } from '../signed-in-toast'
import { requireSession } from '@/lib/auth-server'

// The signed-in console's shell; /admin/login sits outside it. AdminNav is the one client piece.
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  // every console page is behind this, but it does NOT cover server actions (a layout doesn't run for an action POST)
  // or soft navigations (Partial Rendering) — each page and each action carries its own guard
  const user = await requireSession()

  return (
    <>
      {/* sign-in toast; Suspense-wrapped because it uses useSearchParams */}
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
              {/* Logo.png is the dark-on-light mark; Logo-footer.png is the reversed one */}
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
