'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { finalizeAction, regenerateAction } from '../../actions'
import { ADMIN_BASE } from '@/lib/admin-routes'
import { ErrorText } from '../../../ui'

/*
 * Per-stage regenerate. Regenerating `research` clears front, home and deep
 * as well (stages.ts: they consumed the research they were written against),
 * so this warns before doing it and then sends the operator to the progress
 * screen, which re-runs whatever is now missing. The regenerate call has
 * ALREADY happened by then — the progress screen reads the sidecar's `done`
 * list and picks up exactly the cleared stages, so nothing is passed between
 * the two screens.
 *
 * The other three stages rewrite themselves in place, but a regenerate only
 * touches the DRAFT sidecar — the preview renders content/<key>.json. So each
 * one is followed by a finalize, which re-assembles that document from the
 * refreshed draft; without it the operator would regenerate, reload the
 * preview, and see the old copy.
 *
 * Two independent things make that finalize safe on a city that is already
 * live. This panel renders only while a sidecar exists, and publish retires
 * the sidecar — so in the normal flow a live city has no Regenerate buttons
 * at all. That is a UI condition, though, and a partly-completed publish (doc
 * written 'live', sidecar delete interrupted) would break it, so it is not
 * load-bearing on its own: finalizeDraft carries an existing document's
 * `status` and `domain` forward rather than resetting them, which means a
 * finalize refreshes copy and cannot demote a live city no matter which
 * screen calls it. Both are tested.
 */

type StageMeta = { id: string; label: string }

export default function RegeneratePanel({
  cityKey,
  stages,
}: {
  cityKey: string
  stages: StageMeta[]
}) {
  const router = useRouter()
  const [running, setRunning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function regenerate(stage: string) {
    if (
      stage === 'research' &&
      !window.confirm(
        'Regenerating research also clears and re-runs all written copy for this city. Continue?',
      )
    ) {
      return
    }
    setError(null)
    setRunning(stage)
    const result = await regenerateAction(cityKey, stage)
    if (!result.ok) {
      setRunning(null)
      setError(result.error)
      return
    }
    if (stage === 'research') {
      router.push(`${ADMIN_BASE}/generate/${cityKey}`)
      return
    }
    const finalized = await finalizeAction(cityKey)
    setRunning(null)
    if (!finalized.ok) {
      setError(`regenerated, but the site could not be re-assembled: ${finalized.error}`)
      return
    }
    router.refresh()
  }

  return (
    <>
      <p className="mb-3 text-[0.8rem] text-amber-800">
        Research regeneration clears and re-runs all written copy.
      </p>
      <div className="flex flex-wrap gap-2">
        {stages.map((stage) => (
          <Button
            key={stage.id}
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            disabled={running !== null}
            onClick={() => void regenerate(stage.id)}
            title={stage.label}
          >
            {running === stage.id && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {running === stage.id ? `Regenerating ${stage.id}…` : `Regenerate ${stage.id}`}
          </Button>
        ))}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </>
  )
}
