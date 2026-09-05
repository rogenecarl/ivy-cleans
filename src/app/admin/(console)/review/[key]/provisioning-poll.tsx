'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { checkProvisioningAction } from '../../actions'

/*
 * "Is the domain answering yet?", asked from the browser.
 *
 * publishCity buys the domain, points DNS at the host and routes it — then
 * returns. It does not wait for DNS to propagate or for the host to issue a
 * TLS certificate, because that takes minutes and publish is reached through
 * a server action: a serverless function is killed long before that. It is
 * the same constraint that forced the suburb stage into one request per area.
 *
 * So the waiting lives here, where minutes cost nothing. Each poll is one
 * config call on the server; when it comes back live, checkProvisioningLogic
 * clears `doc.provisioning` and this stops.
 *
 * Twenty seconds between polls: DNS propagation is measured in minutes, and a
 * tighter loop would spend the host's rate limit to learn nothing sooner.
 */
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
