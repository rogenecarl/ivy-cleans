import { Suspense, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ADMIN_DASHBOARD, ADMIN_NEW } from '@/server/auth/admin-routes'
import { Button } from '@/components/ui/button'
import { AdminNav } from '@/app/admin/_components/nav'
import { IdentityChip } from '@/app/admin/_components/identity-chip'
import { SignedInToast } from '@/app/admin/_components/signed-in-toast'
import { requireSession } from '@/server/auth/auth-server'

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

            <div className="ml-auto flex items-center gap-3">
              {user.role === 'admin' && (
                <Button asChild size="sm" className="hidden min-h-9 sm:inline-flex" data-role="new-site">
                  <Link href={ADMIN_NEW}>
                    <Plus className="size-4" aria-hidden="true" />
                    New site
                  </Link>
                </Button>
              )}
              <IdentityChip user={user} />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
    </>
  )
}
