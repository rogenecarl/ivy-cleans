import Link from 'next/link'
import { loadDraft } from '@/content/drafts'
import { getCity } from '@/content/store'
import { errorMessage } from '@/pipeline/admin-logic'
import { STAGES } from '@/pipeline/stages'
import { ADMIN_BASE } from '../../base'
import { BTN, BTN_PRIMARY, ErrorText, Panel, StatusChip } from '../../ui'
import PublishBox from './publish-box'
import RegeneratePanel from './regenerate-panel'
import SuburbsEditor from './suburbs-editor'

/*
 * Review + publish. The heavy lifting is the preview link: the generated site
 * is a real, browsable copy of the product at /<key>, so this screen only has
 * to carry the three things the preview cannot do — fix the area list,
 * re-roll a stage, and go live.
 *
 * force-dynamic: every panel here reflects on-disk state the operator is
 * actively changing.
 */
export const dynamic = 'force-dynamic'

export default async function ReviewPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params

  let doc
  try {
    doc = await getCity(key)
  } catch (err) {
    return (
      <>
        <h1 className="mb-2 text-[1.4rem] font-semibold tracking-tight">Not ready for review</h1>
        <ErrorText>{errorMessage(err)}</ErrorText>
        <p className="mt-3 text-[0.85rem] text-[#6b7680]">
          A city reaches this screen once all four stages have finished and the site has been
          assembled.
        </p>
        <div className="mt-4 flex gap-2">
          <Link href={`${ADMIN_BASE}/generate/${key}`} className={BTN}>
            Open progress
          </Link>
          <Link href={ADMIN_BASE} className={BTN}>
            Back to cities
          </Link>
        </div>
      </>
    )
  }

  // The sidecar survives finalize and is deleted by publish, so its presence
  // is exactly "this city can still be regenerated".
  let hasDraft = true
  try {
    await loadDraft(key)
  } catch {
    hasDraft = false
  }

  const isLive = doc.status === 'live'

  return (
    <>
      <div className="mb-6">
        <Link href={ADMIN_BASE} className="text-[0.85rem] text-[#6b7680] hover:underline">
          ← Cities
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-[1.4rem] font-semibold tracking-tight">
            {doc.city}, {doc.state}
          </h1>
          <StatusChip status={doc.status} />
        </div>
        <p className="mt-1 text-[0.85rem] text-[#6b7680]">
          {doc.phoneDisplay}
          {doc.domain ? ` · ${doc.domain}` : ''}
        </p>
      </div>

      <a href={`/${key}`} target="_blank" rel="noreferrer" className={`${BTN_PRIMARY} mb-6`}>
        Open preview ↗
      </a>

      <Panel title="Service areas">
        <SuburbsEditor cityKey={key} initial={doc.research.suburbs} />
      </Panel>

      <Panel title="Regenerate copy">
        {hasDraft ? (
          <RegeneratePanel
            cityKey={key}
            stages={STAGES.map((stage) => ({ id: stage.id, label: stage.label }))}
          />
        ) : (
          <p className="text-[0.85rem] text-[#6b7680]">
            This city has been published, so its working draft has been retired — copy can no longer
            be regenerated from here.
          </p>
        )}
      </Panel>

      <Panel title={isLive ? 'Published' : 'Publish'}>
        {isLive ? (
          <div className="text-[0.85rem]">
            <p>
              <StatusChip status="live" />{' '}
              <span className="ml-1">
                {doc.domain
                  ? `Serving ${doc.domain}. If it does not answer, the domain still has to be attached to the Vercel project.`
                  : 'Live with no domain mapped yet.'}
              </span>
            </p>
            <a href={`/${key}`} target="_blank" rel="noreferrer" className={`${BTN} mt-3`}>
              Open preview ↗
            </a>
          </div>
        ) : (
          <PublishBox cityKey={key} city={doc.city} />
        )}
      </Panel>
    </>
  )
}
