import Link from 'next/link'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { findDraft } from '@/server/content/drafts'
import { getCity } from '@/server/content/store'
import { errorMessage } from '@/server/pipeline/admin-logic'
import { aboutMissing } from '@/server/pipeline/about'
import { STAGES, scoreSuburbs } from '@/server/pipeline/stages'
import { checkCity, findInvisibleChars } from '@/server/content/similarity'
import { checkQuality } from '@/server/content/quality'
import { listLiveCityKeys } from '@/server/content/store'
import { Button } from '@/components/ui/button'
import { ADMIN_BASE, ADMIN_SITES } from '@/server/auth/admin-routes'
import { ErrorText, Panel, StatusChip } from '@/app/admin/_components/ui'
import { ProvisioningPoll } from './provisioning-poll'
import PublishBox from './publish-box'
import RegeneratePanel from './regenerate-panel'
import SuburbsEditor from './suburbs-editor'
import { SourcesPanel } from './sources-panel'
import { getSiteSettings } from '@/server/leads/store'
import { publishChecklist } from '@/server/pipeline/admin-logic/checklist'
import { sitePaths } from '@/site/data/routes'
import { cn } from '@/lib/utils'
import { requireAdmin } from '@/server/auth/auth-server'

// Review + publish. The preview at /<key> does the heavy lifting; this screen fixes the area list, re-rolls a stage,
// and goes live. force-dynamic.
// per-stage regenerate, hidden for now (built and tested)
const SHOW_REGENERATE = false


const SHOW_ADVISORY_FINDINGS = false

export const dynamic = 'force-dynamic'
// one model call per request can run for minutes; the platform default kills it first
export const maxDuration = 300

const TABS = [
  { id: 'checklist', label: 'Checklist' },
  { id: 'sources', label: 'Research & sources' },
  { id: 'pages', label: 'Pages' },
] as const
type Tab = (typeof TABS)[number]['id']

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  // own guard: admin-only
  await requireAdmin()

  const { key } = await params
  const tabParam = (await searchParams).tab
  const tab: Tab = TABS.find((t) => t.id === tabParam)?.id ?? 'checklist'

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

  // the sidecar's presence is exactly "this city can still be regenerated"; loaded once
  const draft = await findDraft(key)
  const hasDraft = draft !== null
  const draftResearch = draft?.research

  // recomputed from the draft's research every render, keyed by slug; a hand-added row has no entry ("not researched").
  // 'skip' never appears: the research stage already dropped those.
  const scored = draftResearch ? scoreSuburbs(draftResearch) : []
  const suburbMeta = Object.fromEntries(
    scored.map((s) => [s.suburb.slug, { score: s.score, verdict: s.verdict, reason: s.reason }]),
  )

  const isLive = doc.status === 'live'

  // what publish would refuse, computed here so the operator sees it before clicking. Live cities only, as in publishCity.
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
  // advisory findings ("worth a look", thin areas) are hidden for now; only what blocks publish is listed
  const quality = checkQuality(doc).filter((finding) => SHOW_ADVISORY_FINDINGS || finding.blocking)
  const thinAreas = SHOW_ADVISORY_FINDINGS ? scored.filter((entry) => entry.verdict !== 'build') : []

  // the leads store is optional here: an outage only makes the inbox line unknown
  const inboxCount = await getSiteSettings(key)
    .then((s) => s?.notifyEmails.length ?? 0)
    .catch(() => null)
  const checklist = publishChecklist({
    key,
    doc,
    undecided: (draft?.claims ?? doc.claims ?? []).filter((c) => c.status === 'pending' || c.status === 'unconfirmed').length,
    duplicationFindings: duplicationUnavailable ? null : duplication.length,
    invisibleChars: invisible.length,
    blockingQuality: checkQuality(doc).filter((f) => f.blocking).length,
    inboxCount,
    aboutMissing: aboutMissing(doc.ops),
  })

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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
          <a href={`/${key}`} target="_blank" rel="noreferrer">
            Open preview
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </Button>
        {!isLive && (
          <span className={cn('text-[0.85rem]', checklist.canPublish ? 'text-emerald-700' : 'text-muted-foreground')} data-role="publish-state">
            {checklist.canPublish ? 'Every required check passes — ready to publish.' : 'Publish unlocks when every required line is ticked.'}
          </span>
        )}
      </div>

      <nav aria-label="Review sections" className="mb-6 flex flex-wrap gap-5 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.id === 'checklist' ? `${ADMIN_BASE}/review/${key}` : `${ADMIN_BASE}/review/${key}?tab=${t.id}`}
            aria-current={tab === t.id ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 py-2.5 text-[0.9rem] font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              tab === t.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.id === 'sources' && checklist.items.find((i) => i.id === 'facts')?.state === 'fail' && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[0.7rem] text-amber-900">!</span>
            )}
          </Link>
        ))}
        <Link
          href={`${ADMIN_BASE}/sites/${key}`}
          className="py-2.5 text-[0.9rem] font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Settings ↗
        </Link>
      </nav>

      {tab === 'sources' && (
        <Panel title="Research & sources">
          <SourcesPanel
            claims={draft?.claims ?? doc.claims}
            sources={draft?.sources ?? doc.sources}
            areaNames={Object.fromEntries((draft?.researchFull ?? doc.research).suburbs.map((s) => [s.slug, s.name]))}
          />
        </Panel>
      )}

      {tab === 'pages' && (
        <Panel title="Pages">
          <ul className="grid gap-1.5 text-[0.85rem] sm:grid-cols-2" data-role="pages">
            {sitePaths(doc).map((p) => (
              <li key={p}>
                <a href={`/${key}${p === '/' ? '' : p}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                  {p}
                  <ExternalLink className="size-3 text-muted-foreground" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {tab === 'checklist' && !isLive && (
        <Panel title="Before it can go live">
          <ul className="divide-y divide-border/60" data-role="checklist">
            {checklist.items.map((item) => (
              <li key={item.id} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 py-2.5 text-[0.9rem]" data-state={item.state}>
                <span
                  aria-hidden="true"
                  className={cn(
                    'font-bold',
                    item.state === 'ok' ? 'text-emerald-600' : item.state === 'fail' ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {item.state === 'ok' ? '✓' : item.state === 'fail' ? '✕' : '–'}
                </span>
                <span>
                  <span className={cn(item.state === 'fail' && 'font-semibold')}>{item.label}</span>
                  <span className="ml-2 text-[0.8rem] text-muted-foreground">{item.detail}</span>
                  <span className="sr-only">{item.state === 'ok' ? ' — done' : item.required ? ' — required' : ' — optional'}</span>
                </span>
                {item.action && item.state !== 'ok' ? (
                  <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-8">
                    <Link href={item.action.href}>{item.action.label}</Link>
                  </Button>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {tab === 'checklist' && (
        <>
      {/* renders nothing when nothing is wrong */}
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

      {/* HIDDEN, not deleted — flip SHOW_REGENERATE. The cheap way to refresh one stage after a prompt change. */}
      {SHOW_REGENERATE && (
        <Panel title="Regenerate copy">
          {hasDraft ? (
          <RegeneratePanel
            cityKey={key}
            stages={STAGES.filter((stage) => stage.id !== 'verify').map((stage) => ({ id: stage.id, label: stage.label }))}
          />
        ) : (
          <p className="text-[0.85rem] text-muted-foreground">
            This city has been published, so its working draft has been retired — copy can no longer
            be regenerated from here.
          </p>
        )}
        </Panel>
      )}

      <Panel title={isLive ? 'Published' : 'Publish'}>
        {isLive ? (
          <div className="text-[0.85rem]">
            <p>
              <StatusChip status="live" />{' '}
              <span className="ml-1">
                {doc.provisioning
                  ? `${doc.provisioning.domain} was bought and routed. Waiting for DNS and TLS to answer — usually a few minutes.`
                  : doc.domain
                    ? `Serving ${doc.domain}.`
                    : 'Live with no domain mapped yet.'}
              </span>
            </p>
            {doc.provisioning && (
              <ProvisioningPoll cityKey={key} domain={doc.provisioning.domain} />
            )}
            <Button asChild variant="outline" className="mt-3 min-h-11 sm:min-h-9">
              <a href={`/${key}`} target="_blank" rel="noreferrer">
                Open preview
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        ) : (
          <PublishBox cityKey={key} city={doc.city} canPublish={checklist.canPublish} />
        )}
      </Panel>
        </>
      )}
    </>
  )
}
