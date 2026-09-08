'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { finalizeAction, regenerateAction } from '../../actions'
import { ADMIN_BASE } from '@/lib/admin-routes'
import { ErrorText } from '../../../ui'
import { stageName } from '../../../stage-names'

// Per-stage regenerate. Regenerating research clears the dependent stages and sends the operator to the progress
// screen. The other stages are followed by a finalize so the preview shows the new copy; finalizeDraft carries
// status/domain forward, so that can't demote a live city.

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
            {/* stageName, not stage.id: "Regenerate suburb" put a field name on a button */}
            {running === stage.id
              ? `Regenerating ${stageName(stage.id, stage.label).toLowerCase()}…`
              : `Regenerate ${stageName(stage.id, stage.label).toLowerCase()}`}
          </Button>
        ))}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </>
  )
}
