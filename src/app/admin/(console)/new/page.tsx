import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ADMIN_SITES } from '@/server/auth/admin-routes'
import { ErrorText } from '@/app/admin/_components/ui'
import { requireAdmin } from '@/server/auth/auth-server'
import { NewSiteWizard } from './new-site-wizard'

// New site: the three-step form (client) posting to createDraftAction. Errors come back as ?error=.

export const dynamic = 'force-dynamic'

export default async function NewCityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  // own guard: creating a city is admin-only
  await requireAdmin()

  const { error } = await searchParams

  return (
    <>
      <div className="mb-6">
        <Link
          href={ADMIN_SITES}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-sm text-[0.85rem] text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Sites
        </Link>
        <h1 className="mt-2 text-[1.4rem] font-semibold tracking-tight">New site</h1>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      <div className="mt-4">
        <NewSiteWizard />
      </div>
    </>
  )
}
