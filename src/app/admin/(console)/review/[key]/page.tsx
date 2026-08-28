import Link from 'next/link'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { loadDraft } from '@/content/drafts'
import { getCity } from '@/content/store'
import { errorMessage } from '@/pipeline/admin-logic'
import { STAGES } from '@/pipeline/stages'
import { Button } from '@/components/ui/button'
import { ADMIN_BASE, ADMIN_SITES } from '@/lib/admin-routes'
import { ErrorText, Panel, StatusChip } from '../../../ui'
import PublishBox from './publish-box'
import RegeneratePanel from './regenerate-panel'
import SuburbsEditor from './suburbs-editor'
import { requireAdmin } from '@/lib/auth-server'

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
  /*
   * Own guard, in addition to the layout's — review and publish are
   * admin-only per src/lib/access.ts, and a manager must not be able to
   * reach this through a soft navigation the layout does not re-render for.
   */
  await requireAdmin()

  const { key } = await params

  let doc
  try {
    doc = await getCity(key)
  } catch (err) {
    return (
      <>
        <h1 className="mb-2 text-[1.4rem] font-semibold tracking-tight">Not ready for review</h1>
        <ErrorText>{errorMessage(err)}</ErrorText>
        <p className="mt-3 text-[0.85rem] text-muted-foreground">
          A city reaches this screen once all four stages have finished and the site has been
          assembled.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
            <Link href={`${ADMIN_BASE}/generate/${key}`}>Open progress</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
            <Link href={ADMIN_SITES}>Back to cities</Link>
          </Button>
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
        <Link
          href={ADMIN_SITES}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-sm text-[0.85rem] text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Sites
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-[1.4rem] font-semibold tracking-tight">
            {doc.city}, {doc.state}
          </h1>
          <StatusChip status={doc.status} />
        </div>
        <p className="mt-1 text-[0.85rem] text-muted-foreground">
          {doc.phoneDisplay}
          {doc.domain ? ` · ${doc.domain}` : ''}
        </p>
      </div>

      <Button asChild size="lg" className="mb-6 min-h-11 sm:min-h-9">
        <a href={`/${key}`} target="_blank" rel="noreferrer">
          Open preview
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </Button>

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
          <p className="text-[0.85rem] text-muted-foreground">
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
            <Button asChild variant="outline" className="mt-3 min-h-11 sm:min-h-9">
              <a href={`/${key}`} target="_blank" rel="noreferrer">
                Open preview
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        ) : (
          <PublishBox cityKey={key} city={doc.city} />
        )}
      </Panel>
    </>
  )
}
