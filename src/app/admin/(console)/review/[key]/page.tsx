import Link from 'next/link'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { loadDraft } from '@/content/drafts'
import { getCity } from '@/content/store'
import { errorMessage } from '@/pipeline/admin-logic'
import { STAGES, scoreSuburbs } from '@/pipeline/stages'
import { checkCity, findInvisibleChars } from '@/content/similarity'
import { checkQuality } from '@/content/quality'
import { listLiveCityKeys } from '@/content/store'
import type { ResearchOutput } from '@/pipeline/schemas'
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
  // is exactly "this city can still be regenerated". Reused below to build
  // the suburb chip metadata, so it's loaded once rather than twice.
  let hasDraft = true
  let draftResearch: ResearchOutput | undefined = undefined
  try {
    draftResearch = (await loadDraft(key)).research
  } catch {
    hasDraft = false
  }

  // Recomputed from the draft's research every render, never persisted: a
  // stored score would drift the moment an operator edits the suburb list
  // below, and a stale score on a decision screen is worse than no score.
  // Keyed by slug so a row the operator added by hand -- one scoreSuburbs
  // never saw -- simply has no entry, which SuburbsEditor renders as "not
  // researched" rather than a wrong or borrowed score. 'skip' verdicts never
  // appear here: applyUniquenessGate already dropped those suburbs from
  // draft.research during the research stage (see stages.ts), before this
  // list could ever reach the review screen.
  const scored = draftResearch ? scoreSuburbs(draftResearch) : []
  const suburbMeta = Object.fromEntries(
    scored.map((s) => [s.suburb.slug, { score: s.score, verdict: s.verdict, reason: s.reason }]),
  )

  const isLive = doc.status === 'live'

  /*
   * What publish would refuse, computed HERE so the operator can see it
   * before clicking rather than after.
   *
   * These same two checks already ran — but only inside publishCity, which
   * means their findings arrived as an error message on a button press. The
   * handoff's own decision (change-list.md, decision 3) put the block at
   * publish specifically "so an operator can look at findings in the review
   * screen first"; that second half was never wired up. This is it.
   *
   * Live cities only, matching publishCity: a draft is not a page Google can
   * see, and comparing against one would let the order two operators happen
   * to work in decide whose copy is "the duplicate".
   */
  let duplication: Awaited<ReturnType<typeof checkCity>> = []
  let duplicationUnavailable = false
  try {
    const otherKeys = (await listLiveCityKeys()).filter((k) => k !== key)
    const published = await Promise.all(
      otherKeys.map(async (k) => {
        const other = await getCity(k)
        return { city: other.city, sections: other.sections }
      }),
    )
    duplication = checkCity(doc.city, doc.sections, published)
  } catch {
    // A live city that will not load is publishCity's problem to report, not
    // a reason to withhold this whole screen.
    duplicationUnavailable = true
  }

  const invisible = findInvisibleChars(doc.sections)
  const quality = checkQuality(doc)
  const thinAreas = scored.filter((entry) => entry.verdict !== 'build')

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

      {/*
        * The answer to "can I publish this?", before the button. Renders
        * nothing at all when there is nothing wrong — a panel that always
        * says READY is one nobody reads.
        */}
      {!isLive &&
        (invisible.length > 0 ||
          duplication.length > 0 ||
          quality.length > 0 ||
          thinAreas.length > 0 ||
          duplicationUnavailable) && (
        <Panel title="Before you publish">
          <ul className="space-y-2 text-[0.85rem]">
            {invisible.length > 0 && (
              <li>
                <span className="font-medium text-destructive">Blocks publish.</span>{' '}
                {invisible.length} invisible character
                {invisible.length === 1 ? '' : 's'} in the copy — {invisible[0].slot}
                {invisible.length > 1 ? ` and ${invisible.length - 1} more` : ''}.
              </li>
            )}
            {duplication.map((finding) => (
              <li key={`${finding.slot}-${finding.otherCity}-${finding.otherSlot}`}>
                <span className="font-medium text-destructive">Blocks publish.</span>{' '}
                {finding.slot} matches {finding.otherCity} {finding.otherSlot} — {finding.detail}
              </li>
            ))}
            {quality.map((finding) => (
              <li key={`${finding.rule}-${finding.slot}-${finding.detail}`}>
                {finding.blocking ? (
                  <span className="font-medium text-destructive">Blocks publish.</span>
                ) : (
                  <span className="font-medium text-muted-foreground">Worth a look.</span>
                )}{' '}
                {finding.slot} {finding.detail}
              </li>
            ))}
            {duplicationUnavailable && (
              <li className="text-muted-foreground">
                Could not compare against the live cities, so publish may still refuse this copy as
                duplicate.
              </li>
            )}
            {thinAreas.length > 0 && (
              <li className="text-muted-foreground">
                {thinAreas.length} area{thinAreas.length === 1 ? '' : 's'} scored thin —{' '}
                {thinAreas.map((entry) => entry.suburb.name).join(', ')}. They will publish, but
                with less to say than the rest.
              </li>
            )}
          </ul>
        </Panel>
      )}

      <Panel title="Service areas">
        <SuburbsEditor cityKey={key} initial={doc.research.suburbs} meta={suburbMeta} />
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
