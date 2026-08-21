import Link from 'next/link'
import { loadDraft } from '@/content/drafts'
import { errorMessage } from '@/pipeline/admin-logic'
import { STAGES } from '@/pipeline/stages'
import { ADMIN_BASE } from '../../base'
import { BTN, ErrorText } from '../../ui'
import StageRunner from './stage-runner'

/*
 * Progress screen. The server half does one thing — read the draft sidecar so
 * the runner starts from the stages that are ALREADY done — and hands the rest
 * to the client runner. force-dynamic because that sidecar changes under us
 * with every stage.
 */
export const dynamic = 'force-dynamic'

export default async function GeneratePage({ params }: { params: Promise<{ key: string }> }) {
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
        <div className="mt-4 flex gap-2">
          <Link href={`${ADMIN_BASE}/review/${key}`} className={BTN}>
            Open review
          </Link>
          <Link href={ADMIN_BASE} className={BTN}>
            Back to cities
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mb-6">
        <Link href={ADMIN_BASE} className="text-[0.85rem] text-[#6b7680] hover:underline">
          ← Cities
        </Link>
        <h1 className="mt-2 text-[1.4rem] font-semibold tracking-tight">
          Generating {draft.facts.city}, {draft.facts.state}
        </h1>
        <p className="mt-1 text-[0.85rem] text-[#6b7680]">
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
