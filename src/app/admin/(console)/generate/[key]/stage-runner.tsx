'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, RotateCw } from 'lucide-react'
import type { ProgressSnapshot } from '@/pipeline/admin-logic'
import type { ProgressEvent } from '@/pipeline/progress'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  finalizeAction,
  getProgressAction,
  pendingServicesAction,
  pendingSuburbsAction,
  runStageAction,
} from '../../actions'
import { ADMIN_BASE } from '@/lib/admin-routes'
import { stageName } from '../../../stage-names'
import { ErrorText, Pill } from '../../../ui'

/*
 * The progress screen's engine. One server-action call per stage, in order,
 * driven from the browser — NOT one long request that runs the whole
 * pipeline. Each stage is a research or writing call to Claude that can take
 * a minute; a single request doing all four would sit right on top of a
 * serverless duration cap, and a timeout halfway through would leave the
 * operator with no idea which stages had landed. Per-stage calls also make
 * every failure individually retryable, and the draft sidecar records `done`
 * server-side, so a reload picks up exactly where this left off.
 *
 * `cityKey`, not `key`: `key` is reserved by React — passed as a prop it would
 * be consumed as the reconciliation key and never reach this component.
 *
 * The stage list is a prop rather than an import because src/pipeline/stages.ts
 * reaches the filesystem through the draft store; it cannot cross into a
 * client bundle.
 *
 * Stage 3 (shadcn redesign): everything below the polling/execution effects
 * is presentational only. The polling interval, how progress events are
 * read, the status-icon glyphs (✓/⏳/✗/•) and the activity feed's event
 * labels are UNCHANGED — scripts/admin-e2e.mjs asserts on the glyphs and the
 * data-role="status-icon"/"skill-name" hooks, and the labels themselves come
 * straight from the running pipeline, not from this component.
 */

type StageMeta = { id: string; label: string }

type Props = {
  cityKey: string
  stages: StageMeta[]
  initialDone: string[]
}

type Phase = 'idle' | 'running' | 'error'

/**
 * How long a stage took, measured in the browser as the runner drives it.
 *
 * Only stages run in THIS session appear here. A reload mid-pipeline knows
 * from the draft which stages are done but not how long they took, and
 * inventing a duration for them would be worse than leaving the cell blank.
 *
 * Deliberately NOT a model-call count. The client counts REQUESTS, and the
 * two are not the same number — the research stage is one request and two
 * model calls (search, then the structuring pass). Showing requests under a
 * heading that reads as calls would understate what a run costs, so the only
 * per-item number here is the one that is exactly right: how many areas or
 * service pages the loop has left.
 */
type StageTiming = { ms: number }

/** m:ss. Every stage is seconds-to-minutes; nothing here runs for an hour. */
function duration(ms: number): string {
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export default function StageRunner({ cityKey, stages, initialDone }: Props) {
  const [done, setDone] = useState<string[]>(initialDone)
  const [current, setCurrent] = useState<string | null>(null)
  const [failed, setFailed] = useState<{ stage: string; message: string } | null>(null)
  const [finalizePhase, setFinalizePhase] = useState<Phase | 'done'>('idle')
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null)
  /*
   * Per-area progress for the suburb stage. That stage makes one model call
   * per area, and the client drives that loop (see below), so it is the only
   * place that knows "8 of 12, writing Sugar Land" while it is happening.
   */
  /* Per-item progress for the two stages that make one model call per item
   * -- suburb (per area) and service (per service page). One piece of state
   * because only one stage runs at a time. */
  const [itemProgress, setItemProgress] = useState<{ done: number; total: number; name: string } | null>(null)

  /* Measured per stage as this session runs it — see StageTiming. */
  const [timings, setTimings] = useState<Record<string, StageTiming>>({})
  /* Ticks once a second so the running stage's elapsed time moves. */
  const [now, setNow] = useState(() => Date.now())
  /* When the CURRENT stage started, so its row counts its own time. */
  const [stageStartedAt, setStageStartedAt] = useState<number | null>(null)
  /* State, not refs: both are READ during render (the ledger line and each
   * running row's elapsed time), and a ref read in render is a stale value
   * React never re-renders for. */
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null)
  /* Frozen when the run ends, so the total stops rather than counting on. */
  const [runEndedAt, setRunEndedAt] = useState<number | null>(null)

  useEffect(() => {
    if (current === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [current])

  /*
   * A single in-flight guard for the whole runner. React 19's dev-mode double
   * effect invocation would otherwise start two passes over the same stages,
   * and a second `runStage` for a stage already in flight would call the model
   * twice — money, not just noise. A ref (not state) because the check has to
   * see the write immediately, before the next render.
   */
  const busy = useRef(false)

  const finalize = useCallback(async () => {
    setFinalizeError(null)
    setFinalizePhase('running')
    const result = await finalizeAction(cityKey)
    if (result.ok) {
      setFinalizePhase('done')
    } else {
      setFinalizePhase('error')
      setFinalizeError(result.error)
    }
  }, [cityKey])

  /*
   * Walk the areas the suburb stage still owes, one request each. The list
   * comes from the server because it depends on research, which has only just
   * run. Areas already written are excluded, so a resume after a failure pays
   * for exactly what is left.
   */
  const runSuburbAreas = useCallback(async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    const pending = await pendingSuburbsAction(cityKey)
    if (!pending.ok) return { ok: false, error: pending.error }

    const total = pending.areas.length
    for (const [i, area] of pending.areas.entries()) {
      setItemProgress({ done: i, total, name: area.name })
      const r = await runStageAction(cityKey, 'suburb', area.slug)
      if (!r.ok) return r
    }
    setItemProgress({ done: total, total, name: '' })

    // No pending areas still has to reach the server: it is what marks the
    // stage done when every area was already written on an earlier attempt.
    return runStageAction(cityKey, 'suburb')
  }, [cityKey])

  /*
   * The same walk for the six service pages. Unlike the areas, this list does
   * not depend on research -- the same seven services exist in every city --
   * but the reason for driving it one request at a time is identical: six
   * sequential model calls in one request is minutes, and a serverless
   * function is killed long before that.
   */
  const runServicePages = useCallback(async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    const pending = await pendingServicesAction(cityKey)
    if (!pending.ok) return { ok: false, error: pending.error }

    const total = pending.services.length
    for (const [i, service] of pending.services.entries()) {
      setItemProgress({ done: i, total, name: service.name })
      const r = await runStageAction(cityKey, 'service', service.slug)
      if (!r.ok) return r
    }
    setItemProgress({ done: total, total, name: '' })

    // As above: the no-pending call is what marks the stage done when every
    // service was already written on an earlier attempt.
    return runStageAction(cityKey, 'service')
  }, [cityKey])

  const run = useCallback(
    async (from: string[]) => {
      if (busy.current) return
      busy.current = true
      setFailed(null)

      let completed = from
      try {
        for (const stage of stages) {
          if (completed.includes(stage.id)) continue
          setCurrent(stage.id)
          const stageStart = Date.now()
          setRunStartedAt((v) => v ?? stageStart)
          setRunEndedAt(null)
          setStageStartedAt(stageStart)
          setNow(stageStart)

          /*
           * suburb and service are driven ONE ITEM PER REQUEST. Twelve areas
           * is twelve sequential model calls, six service pages is six; done
           * server-side that is minutes in a single request, and a serverless
           * function is killed long before that. One item per request is
           * ~20s, inside any platform limit, and it is also the only way the
           * client can show which area or page is being written.
           */
          const result =
            stage.id === 'suburb'
              ? await runSuburbAreas()
              : stage.id === 'service'
                ? await runServicePages()
                : await runStageAction(cityKey, stage.id)

          if (!result.ok) {
            setCurrent(null)
            setItemProgress(null)
            setFailed({ stage: stage.id, message: result.error })
            return
          }
          setItemProgress(null)
          setTimings((t) => ({ ...t, [stage.id]: { ms: Date.now() - stageStart } }))
          completed = [...completed, stage.id]
          setDone(completed)
        }
        setCurrent(null)
        setRunEndedAt(Date.now())
        if (completed.length === stages.length) await finalize()
      } finally {
        busy.current = false
      }
    },
    [cityKey, stages, finalize],
  )

  // Kick off on mount, and only on mount: the operator lands here straight
  // from the form, so generation should already be moving.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    void run(initialDone)
  }, [run, initialDone])

  /*
   * Display-only polling of the activity log — NOT part of the execution
   * engine above. StageRunner's own sequential loop is still what drives
   * generation forward; this effect only fetches what the server has
   * recorded so far so the skill cards can show it. Stops once finalize has
   * landed, since nothing further will be appended to the log after that.
   */
  useEffect(() => {
    if (finalizePhase === 'done') return
    let stopped = false
    const tick = async () => {
      try {
        const snap = await getProgressAction(cityKey)
        if (!stopped) setSnapshot(snap)
      } catch {
        // Swallow — a transient fetch failure (e.g. dev-server restart)
        // shouldn't surface as an unhandled rejection or stop polling.
      }
    }
    void tick()
    const id = setInterval(() => void tick(), 1200)
    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [cityKey, finalizePhase])

  const allDone = done.length === stages.length

  return (
    <>
      {/*
        * No headline progress bar. Five rows with their own state already say
        * how far along the run is, and a second bar restating it is chrome
        * competing with the content it summarises.
        */}
      <ol className="divide-y divide-border/40">
        {stages.map((stage) => {
          const isDone = done.includes(stage.id)
          const isRunning = current === stage.id
          const items =
            isRunning && (stage.id === 'suburb' || stage.id === 'service') ? itemProgress : null
          const isFailed = failed?.stage === stage.id
          // The glyphs are load-bearing: scripts/admin-e2e.mjs polls
          // [data-role="status-icon"] for '✓' to know the run finished.
          const icon = isDone ? '✓' : isRunning ? '⏳' : isFailed ? '✗' : '•'
          /*
           * Colour ONLY where it changes what you would do. A finished stage
           * is not green: when all five land, an all-green list carries no
           * information at all, and the eye stops reading colour that is
           * always there. Running and failed are the two states worth a hue.
           */
          const tone = isFailed
            ? 'text-destructive'
            : isRunning
              ? 'text-blue-700'
              : 'text-muted-foreground'
          const name = stageName(stage.id, stage.label)
          const timing = timings[stage.id]
          const elapsed = timing?.ms

          // Every event this stage has logged so far, oldest first — 'error'
          // events are excluded here because the `isFailed` block above
          // already owns error display.
          const stageEvents: ProgressEvent[] = snapshot?.ok
            ? snapshot.events.filter((e) => e.stage === stage.id && e.kind !== 'error')
            : []
          const recentEvents = stageEvents.slice(-3)
          // The finished summary line: research logs a 'found' digest before
          // its generic 'done' marker ("Research complete"), so 'found' wins
          // when present; front/home/deep only ever log 'done', which already
          // carries their digest.
          const summaryEvent =
            [...stageEvents].reverse().find((e) => e.kind === 'found') ??
            [...stageEvents].reverse().find((e) => e.kind === 'done')
          const research = stage.id === 'research' && snapshot?.ok ? snapshot.research : null

          // No background tint on the running row: it already carries a
          // coloured glyph, a bolder name, a moving progress bar and a live
          // timer. A fifth signal for one state is decoration.
          return (
            <li key={stage.id} className="py-2.5">
              <div className="flex items-start gap-3 px-1">
                {/* Fixed-width so every glyph, name and number lines up down
                    the list without a table or a rule to guide the eye. */}
                <span
                  className={cn('w-4 shrink-0 text-center text-[0.9rem] leading-6', tone)}
                  data-role="status-icon"
                  aria-hidden
                >
                  {icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p
                      className={cn(
                        'text-[0.9rem]',
                        isRunning ? 'font-semibold' : isDone ? 'font-medium' : 'text-muted-foreground',
                      )}
                      data-role="stage-name"
                    >
                      {name}
                    </p>
                    {/* The numeric column. Monospace and tabular so counts
                        and timings form a straight edge down the list —
                        the one place a mono face earns its keep here. Two
                        spans with a gap, not one string with spaces in it:
                        HTML collapses runs of whitespace. */}
                    <span className="flex shrink-0 items-baseline gap-4 font-mono text-[0.75rem] tabular-nums text-muted-foreground">
                      {items && items.total > 0 && (
                        <span>
                          {items.done} of {items.total}
                        </span>
                      )}
                      {(isRunning || elapsed !== undefined) && (
                        <span className="w-9 text-right">
                          {isRunning && stageStartedAt !== null
                            ? duration(now - stageStartedAt)
                            : elapsed !== undefined
                              ? duration(elapsed)
                              : ''}
                        </span>
                      )}
                    </span>
                  </div>

                  {/*
                    suburb and service each take minutes and, before this,
                    showed a spinner with no sign of movement for the whole
                    run. The count comes from the client's own per-item
                    loop, so it is accurate the moment it changes — and it
                    is printed once, in the numeric column above, rather
                    than again beside the bar.
                  */}
                  {items && items.total > 0 && (
                    <div className="mt-1.5 flex items-center gap-2" data-role="area-progress">
                      <div className="h-[3px] w-32 shrink-0 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
                          style={{ width: `${Math.round((items.done / items.total) * 100)}%` }}
                        />
                      </div>
                      <span className="truncate text-[0.75rem] text-foreground/70">
                        {items.name || 'Finishing up'}
                      </span>
                    </div>
                  )}

                  {isRunning && recentEvents.length > 0 && (
                    <ScrollArea className="mt-2 max-h-24">
                      <ul className="space-y-0.5">
                        {recentEvents.map((event, index) => (
                          <li
                            key={`${event.at}-${index}`}
                            className={cn(
                              'truncate text-[0.75rem] text-muted-foreground',
                              index === recentEvents.length - 1 && 'admin-pulse text-foreground/80',
                            )}
                          >
                            {event.label}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  )}

                  {isDone && summaryEvent && (
                    <p className="mt-1 text-[0.75rem] text-muted-foreground">{summaryEvent.label}</p>
                  )}

                  {research && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {research.suburbs.map((name) => (
                        <Pill key={name}>{name}</Pill>
                      ))}
                      <Pill>{research.zips.length} ZIP codes</Pill>
                      <Pill>{research.subdivisions} subdivisions</Pill>
                    </div>
                  )}

                  {isFailed && (
                    <>
                      <ErrorText>{failed.message}</ErrorText>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 min-h-11 sm:min-h-8"
                        onClick={() => void run(done)}
                      >
                        <RotateCw className="size-3.5" aria-hidden="true" />
                        Retry this stage
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {/*
        * The ledger. One rule, at the foot of the list, carrying the two
        * numbers that describe the whole run rather than any one stage.
        */}
      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-2.5">
        <span className="text-[0.75rem] text-muted-foreground">
          {done.length} of {stages.length} stages
        </span>
        {runStartedAt !== null && (
          <span className="font-mono text-[0.75rem] tabular-nums text-muted-foreground">
            {duration((runEndedAt ?? now) - runStartedAt)}
          </span>
        )}
      </div>

      <div className="mt-6">
        {!allDone && !failed && (
          <p className="text-[0.85rem] text-muted-foreground">
            Generating — this takes a few minutes. Leave this tab open; if it closes, reopening this
            page resumes from the last finished stage.
          </p>
        )}

        {allDone && finalizePhase === 'running' && (
          <p className="flex items-center gap-2 text-[0.85rem] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Assembling the site…
          </p>
        )}

        {allDone && finalizePhase === 'error' && (
          <>
            <ErrorText>Could not assemble the site: {finalizeError}</ErrorText>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 min-h-11 sm:min-h-8"
              onClick={() => void finalize()}
            >
              <RotateCw className="size-3.5" aria-hidden="true" />
              Retry finalize
            </Button>
          </>
        )}

        {allDone && finalizePhase === 'done' && (
          <Button asChild size="lg" className="min-h-11 sm:min-h-9">
            <Link href={`${ADMIN_BASE}/review/${cityKey}`}>Draft ready →</Link>
          </Button>
        )}
      </div>
    </>
  )
}
