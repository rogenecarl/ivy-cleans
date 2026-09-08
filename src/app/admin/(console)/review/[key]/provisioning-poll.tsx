'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { checkProvisioningAction } from '../../actions'

// "Is the domain answering yet?", polled from the browser every 20s: publishCity returns without waiting for DNS/TLS
// (serverless timeout). checkProvisioningLogic clears doc.provisioning when live, and this stops.
const EVERY_MS = 20_000

export function ProvisioningPoll({ cityKey, domain }: { cityKey: string; domain: string }) {
  const [live, setLive] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checks, setChecks] = useState(0)

  const check = useCallback(async () => {
    setChecking(true)
    const result = await checkProvisioningAction(cityKey)
    setChecking(false)
    setChecks((n) => n + 1)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    if (result.live) setLive(true)
  }, [cityKey])

  useEffect(() => {
    if (live) return
    const id = setInterval(() => void check(), EVERY_MS)
    return () => clearInterval(id)
  }, [check, live])

  if (live) {
    return (
      <p className="mt-2 text-[0.85rem] text-green-800">
        {domain} is answering. Reload to clear this panel.
      </p>
    )
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.85rem] text-muted-foreground">
      <span className="flex items-center gap-2">
        {checking && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
        {error
          ? `Could not check: ${error}`
          : checks === 0
            ? 'Checking every 20 seconds…'
            : `Not answering yet — ${checks} check${checks === 1 ? '' : 's'} so far.`}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={checking}
        onClick={() => void check()}
        className="min-h-11 sm:min-h-8"
      >
        <RotateCw className="size-3.5" aria-hidden="true" />
        Check now
      </Button>
    </div>
  )
}
