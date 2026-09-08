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
import { STAGE_EXPECTED, stageName } from '../../../stage-names'
import { ErrorText, Pill } from '../../../ui'

// One server-action call per stage, driven from the browser: one long request would hit the serverless cap and
// leave no idea which stages landed. The sidecar records `done`, so a reload resumes. `cityKey`, not `key` (reserved
// by React). Stage list is a prop because stages.ts reaches the filesystem. Glyphs/data-role hooks are asserted by scripts/admin-e2e.mjs.

type StageMeta = { id: string; label: string }

type Props = {
  cityKey: string
  stages: StageMeta[]
  initialDone: string[]
}

type Phase = 'idle' | 'running' | 'error'

// how long a stage took in THIS session; no invented durations for stages done before a reload. Not a model-call count.
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
  // per-area progress for the suburb stage: the client drives that loop
  // per-item progress for suburb (per area) and service (per page); one state since only one stage runs at a time
  const [itemProgress, setItemProgress] = useState<{ done: number; total: number; name: string } | null>(null)

  /* Measured per stage as this session runs it — see StageTiming. */
  const [timings, setTimings] = useState<Record<string, StageTiming>>({})
  /* Ticks once a second so the running stage's elapsed time moves. */
  const [now, setNow] = useState(() => Date.now())
  /* When the CURRENT stage started, so its row counts its own time. */
  const [stageStartedAt, setStageStartedAt] = useState<number | null>(null)
  // state, not refs: both are read during render
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null)
  /* Frozen when the run ends, so the total stops rather than counting on. */
  const [runEndedAt, setRunEndedAt] = useState<number | null>(null)

  useEffect(() => {
    if (current === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [current])

  // one in-flight guard: React 19 dev double-invokes effects, and a second runStage would call the model twice
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

  // walk the areas still owed, one request each; the list comes from the server since it depends on research
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

  // the same walk for the service pages
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

          // suburb and service run one item per request (~20s each); minutes in one request is killed
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

  // display-only polling of the activity log; stops once finalize has landed
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
      {/* no headline progress bar: five rows already say how far along the run is */}
      <ol className="divide-y divide-border/40">
        {stages.map((stage) => {
          const isDone = done.includes(stage.id)
          const isRunning = current === stage.id
          const items =
            isRunning && (stage.id === 'suburb' || stage.id === 'service') ? itemProgress : null
          const isFailed = failed?.stage === stage.id
          // The glyphs are load-bearing: scripts/admin-e2e.mjs polls
          // [data-role="status-icon"] for '✓' to know the run finished.
          // a real spinner for the running row; the other glyphs are polled by scripts/admin-e2e.mjs
          const icon = isDone ? '✓' : isFailed ? '✗' : isRunning ? '' : '•'
          // colour only for running and failed: an all-green list says nothing
          const tone = isFailed
            ? 'text-destructive'
            : isRunning
              ? 'text-blue-700'
              : 'text-muted-foreground'
          const name = stageName(stage.id, stage.label)
          const timing = timings[stage.id]
          const elapsed = timing?.ms

          // events oldest first; 'error' is shown by the isFailed block
          const stageEvents: ProgressEvent[] = snapshot?.ok
            ? snapshot.events.filter((e) => e.stage === stage.id && e.kind !== 'error')
            : []
          const recentEvents = stageEvents.slice(-3)
          const searchCount = stageEvents.filter((e) => e.kind === 'search').length
          // research logs a 'found' digest before its 'done' marker, so 'found' wins when present
          const summaryEvent =
            [...stageEvents].reverse().find((e) => e.kind === 'found') ??
            [...stageEvents].reverse().find((e) => e.kind === 'done')
          const research = stage.id === 'research' && snapshot?.ok ? snapshot.research : null

          // no tint on the running row: it already has four signals
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
                  {isRunning && !isFailed ? (
                    <Loader2 className="mx-auto size-3.5 animate-spin" />
                  ) : (
                    icon
                  )}
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
                    {/* numeric column: mono + tabular so counts line up; two spans since HTML collapses whitespace */}
                    <span className="flex shrink-0 items-baseline gap-4 font-mono text-[0.75rem] tabular-nums text-muted-foreground">
                      {/* research has no honest denominator: show the count, not a bar */}
                      {isRunning && searchCount > 0 && (
                        <span>
                          {searchCount} search{searchCount === 1 ? '' : 'es'}
                        </span>
                      )}
                      {items && items.total > 0 && (
                        <span>
                          {items.done} of {items.total}
                        </span>
                      )}
                      {isRunning || elapsed !== undefined ? (
                        <span className="w-16 text-right">
                          {isRunning && stageStartedAt !== null
                            ? duration(now - stageStartedAt)
                            : elapsed !== undefined
                              ? duration(elapsed)
                              : ''}
                        </span>
                      ) : (
                        // not started: say how long it usually takes so slow doesn't read as stuck
                        <span className="w-16 text-right opacity-60">
                          {STAGE_EXPECTED[stage.id] ?? ''}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* per-item bar for suburb and service; the count is printed once, in the numeric column */}
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

      {/* the ledger: two numbers for the whole run */}
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
