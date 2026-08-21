'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProgressSnapshot } from '@/pipeline/admin-logic'
import type { ProgressEvent } from '@/pipeline/progress'
import { finalizeAction, getProgressAction, runStageAction } from '../../actions'
import { ADMIN_BASE } from '../../base'
import { SKILL_META } from '../../skills-meta'
import { BTN, BTN_PRIMARY, ErrorText } from '../../ui'

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
 */

type StageMeta = { id: string; label: string }

type Props = {
  cityKey: string
  stages: StageMeta[]
  initialDone: string[]
}

type Phase = 'idle' | 'running' | 'error'

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
      <ol className="rounded-lg border border-[#d8dde2] bg-white">
        {stages.map((stage) => {
          const isDone = done.includes(stage.id)
          const isRunning = current === stage.id
          const isFailed = failed?.stage === stage.id
          const icon = isDone ? '✓' : isRunning ? '⏳' : isFailed ? '✗' : '•'
          const tone = isDone
            ? 'text-[#106b35]'
            : isFailed
              ? 'text-[#a11212]'
              : isRunning
                ? 'text-[#1a4fb4]'
                : 'text-[#9aa4ad]'
          const meta = SKILL_META[stage.id] ?? { icon: '•', name: stage.label, tagline: '' }

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
            <li
              key={stage.id}
              className="flex items-start gap-3 border-b border-[#e6eaee] px-4 py-3 last:border-b-0"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f3f5f7] text-[1rem]"
                data-role="skill-icon"
                aria-hidden
              >
                {meta.icon}
              </span>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[0.95rem] font-semibold text-[#1b1f23]" data-role="skill-name">
                    {meta.name}
                  </p>
                  <span
                    className={`w-4 shrink-0 text-[1rem] leading-6 ${tone}`}
                    data-role="status-icon"
                    aria-hidden
                  >
                    {icon}
                  </span>
                </div>
                <p className="text-[0.75rem] text-[#6b7680]">{meta.tagline}</p>

                {isRunning && recentEvents.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {recentEvents.map((event, index) => (
                      <li
                        key={`${event.at}-${index}`}
                        className={`font-mono text-[0.75rem] text-[#3a444d] ${
                          index === recentEvents.length - 1 ? 'admin-pulse' : ''
                        }`}
                      >
                        {event.label}
                      </li>
                    ))}
                  </ul>
                )}

                {isDone && summaryEvent && (
                  <p className="mt-2 text-[0.75rem] text-[#6b7680]">{summaryEvent.label}</p>
                )}

                {research && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {research.suburbs.map((name) => (
                      <span
                        key={name}
                        className="rounded-full border border-[#d8dde2] px-2 py-0.5 text-[0.7rem] text-[#3a444d]"
                      >
                        {name}
                      </span>
                    ))}
                    <span className="rounded-full border border-[#d8dde2] px-2 py-0.5 text-[0.7rem] text-[#3a444d]">
                      {research.zips.length} ZIP codes
                    </span>
                    <span className="rounded-full border border-[#d8dde2] px-2 py-0.5 text-[0.7rem] text-[#3a444d]">
                      {research.landmarks.length} landmarks
                    </span>
                  </div>
                )}

                {isFailed && (
                  <>
                    <ErrorText>{failed.message}</ErrorText>
                    <button
                      type="button"
                      className={`${BTN} mt-2`}
                      onClick={() => void run(done)}
                    >
                      Retry this stage
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-6">
        {!allDone && !failed && (
          <p className="text-[0.85rem] text-[#6b7680]">
            Generating — this takes a few minutes. Leave this tab open; if it closes, reopening this
            page resumes from the last finished stage.
          </p>
        )}

        {allDone && finalizePhase === 'running' && (
          <p className="text-[0.85rem] text-[#6b7680]">Assembling the site…</p>
        )}

        {allDone && finalizePhase === 'error' && (
          <>
            <ErrorText>Could not assemble the site: {finalizeError}</ErrorText>
            <button type="button" className={`${BTN} mt-2`} onClick={() => void finalize()}>
              Retry finalize
            </button>
          </>
        )}

        {allDone && finalizePhase === 'done' && (
          <Link href={`${ADMIN_BASE}/review/${cityKey}`} className={BTN_PRIMARY}>
            Draft ready →
          </Link>
        )}
      </div>
    </>
  )
}
