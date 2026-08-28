import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { loadDraft } from '@/content/drafts'
import { errorMessage } from '@/pipeline/admin-logic'
import { STAGES } from '@/pipeline/stages'
import { Button } from '@/components/ui/button'
import { ADMIN_BASE, ADMIN_SITES } from '@/lib/admin-routes'
import { ErrorText } from '../../../ui'
import StageRunner from './stage-runner'
import { requireAdmin } from '@/lib/auth-server'

/*
 * Progress screen. The server half does one thing — read the draft sidecar so
 * the runner starts from the stages that are ALREADY done — and hands the rest
 * to the client runner. force-dynamic because that sidecar changes under us
 * with every stage.
 */
export const dynamic = 'force-dynamic'

export default async function GeneratePage({ params }: { params: Promise<{ key: string }> }) {
  /*
   * Own guard, in addition to the layout's — the pipeline screens are
   * admin-only per src/lib/access.ts, and a manager must not be able to
   * reach this through a soft navigation the layout does not re-render for.
   */
  await requireAdmin()

  const { key } = await params

  let draft
  try {
    draft = await loadDraft(key)
  } catch (err) {
    // The usual cause is a published city: publishCity() retires the sidecar,
    // so there is nothing left to generate and the review screen is the right
    // place to land.
    return (
      <>
        <h1 className="mb-2 text-[1.4rem] font-semibold tracking-tight">Nothing to generate</h1>
        <ErrorText>{errorMessage(err)}</ErrorText>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
            <Link href={`${ADMIN_BASE}/review/${key}`}>Open review</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
            <Link href={ADMIN_SITES}>Back to cities</Link>
          </Button>
        </div>
      </>
    )
  }

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
        <h1 className="mt-2 text-[1.4rem] font-semibold tracking-tight">
          Generating {draft.facts.city}, {draft.facts.state}
        </h1>
        <p className="mt-1 text-[0.85rem] text-muted-foreground">
          {draft.facts.phoneDisplay} · four stages, run one at a time so any single failure can be
          retried on its own.
        </p>
      </div>

      <StageRunner
        cityKey={key}
        stages={STAGES.map((stage) => ({ id: stage.id, label: stage.label }))}
        initialDone={draft.done}
      />
    </>
  )
}
