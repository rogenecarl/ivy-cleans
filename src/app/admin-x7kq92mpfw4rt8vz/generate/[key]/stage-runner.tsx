'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, MapPinned, PenLine, RotateCw, Search, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ProgressSnapshot } from '@/pipeline/admin-logic'
import type { ProgressEvent } from '@/pipeline/progress'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { finalizeAction, getProgressAction, runStageAction } from '../../actions'
import { ADMIN_BASE } from '../../base'
import { SKILL_META } from '../../skills-meta'
import { ErrorText, Pill } from '../../ui'

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

/** Per-stage icon, purely decorative (skill-icon is not asserted by the e2e
 * suite) — lucide instead of the SKILL_META emoji field, per the admin's
 * "no emoji" UX rule. */
const STAGE_ICONS: Record<string, LucideIcon> = {
  research: Search,
  front: PenLine,
  home: MapPinned,
  deep: Sparkles,
}

export default function StageRunner({ cityKey, stages, initialDone }: Props) {
  const [done, setDone] = useState<string[]>(initialDone)
  const [current, setCurrent] = useState<string | null>(null)
  const [failed, setFailed] = useState<{ stage: string; message: string } | null>(null)
  const [finalizePhase, setFinalizePhase] = useState<Phase | 'done'>('idle')
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null)

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
          const result = await runStageAction(cityKey, stage.id)
          if (!result.ok) {
            setCurrent(null)
            setFailed({ stage: stage.id, message: result.error })
            return
          }
          completed = [...completed, stage.id]
          setDone(completed)
        }
        setCurrent(null)
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
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-[0.8rem] text-muted-foreground">
          <span>
            {done.length} of {stages.length} stages complete
          </span>
        </div>
        <Progress value={(done.length / stages.length) * 100} />
      </div>

      <ol className="space-y-3">
        {stages.map((stage) => {
          const isDone = done.includes(stage.id)
          const isRunning = current === stage.id
          const isFailed = failed?.stage === stage.id
          const icon = isDone ? '✓' : isRunning ? '⏳' : isFailed ? '✗' : '•'
          const tone = isDone
            ? 'text-green-700'
            : isFailed
              ? 'text-destructive'
              : isRunning
                ? 'text-blue-700'
                : 'text-muted-foreground'
          const meta = SKILL_META[stage.id] ?? { icon: '•', name: stage.label, tagline: '' }
          const StageIcon = STAGE_ICONS[stage.id]

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

          return (
            <li key={stage.id}>
              <Card
                className={cn(
                  'gap-0 py-4',
                  isFailed && 'border-destructive/50 bg-destructive/5',
                  isRunning && 'border-blue-600/40',
                )}
              >
                <CardContent className="flex items-start gap-3 px-4">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted"
                    data-role="skill-icon"
                    aria-hidden="true"
                  >
                    {StageIcon ? <StageIcon className="size-4 text-muted-foreground" /> : meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[0.95rem] font-semibold" data-role="skill-name">
                        {meta.name}
                      </p>
                      <span
                        className={cn('w-4 shrink-0 text-[1rem] leading-6', tone)}
                        data-role="status-icon"
                        aria-hidden
                      >
                        {icon}
                      </span>
                    </div>
                    <p className="text-[0.75rem] text-muted-foreground">{meta.tagline}</p>

                    {isRunning && recentEvents.length > 0 && (
                      <ScrollArea className="mt-2 max-h-24">
                        <ul className="space-y-0.5">
                          {recentEvents.map((event, index) => (
                            <li
                              key={`${event.at}-${index}`}
                              className={cn(
                                'font-mono text-[0.75rem] text-foreground/80',
                                index === recentEvents.length - 1 && 'admin-pulse',
                              )}
                            >
                              {event.label}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    )}

                    {isDone && summaryEvent && (
                      <p className="mt-2 text-[0.75rem] text-muted-foreground">{summaryEvent.label}</p>
                    )}

                    {research && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {research.suburbs.map((name) => (
                          <Pill key={name}>{name}</Pill>
                        ))}
                        <Pill>{research.zips.length} ZIP codes</Pill>
                        <Pill>{research.landmarks.length} landmarks</Pill>
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
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ol>

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
