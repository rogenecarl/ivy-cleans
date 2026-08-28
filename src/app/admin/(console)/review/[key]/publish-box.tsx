'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { publishAction } from '../../actions'
import { ErrorText } from '../../../ui'

/*
 * Publish. Two irreversible-ish things happen at once (the city goes live and
 * its draft sidecar is retired), so this is confirmed before it runs.
 *
 * Stage 3: the confirmation moved from window.confirm() to an AlertDialog so
 * the operator sees exactly what is about to happen — including whether a
 * domain will be attached — rather than a generic "are you sure". The
 * dialog's copy is computed from the domain field at the moment the trigger
 * is clicked, same as the confirm() message it replaces.
 *
 * The domain is optional and separate from the DNS work: publishCity() maps
 * the host in content/_domains.json so the proxy will route it, but attaching
 * that domain to the Vercel project is a manual step outside this app. The
 * success panel says so, because a city that publishes cleanly and then does
 * not answer on its domain is the one failure mode this screen can predict.
 */

export default function PublishBox({ cityKey, city }: { cityKey: string; city: string }) {
  const router = useRouter()
  const [domain, setDomain] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState<{ domain: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function publish() {
    const host = domain.trim()
    setError(null)
    setPublishing(true)
    const result = await publishAction(cityKey, host === '' ? undefined : host)
    setPublishing(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPublished({ domain: host })
    router.refresh()
  }

  if (published) {
    return (
      <div className="rounded-md border border-green-600/30 bg-green-50 px-4 py-3 text-[0.85rem] text-green-800">
        <p className="font-semibold">Live.</p>
        <p className="mt-1">
          Manual step: attach the domain to the Vercel project.
          {published.domain ? ` (${published.domain})` : ' No domain was set — add one later.'}
        </p>
      </div>
    )
  }

  const host = domain.trim()

  return (
    <>
      <Label htmlFor="domain" className="mb-1.5 block text-[0.8rem] font-semibold">
        Domain
      </Label>
      <Input
        id="domain"
        value={domain}
        disabled={publishing}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="miamicleans.com — leave blank to publish without a domain"
        className="min-h-11 sm:min-h-9"
      />
      <p className="mt-1 text-[0.75rem] text-muted-foreground">
        Routing only. The domain still has to be attached to the Vercel project by hand.
      </p>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button type="button" disabled={publishing} className="mt-3 min-h-11 sm:min-h-9">
            {publishing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish {city}?</AlertDialogTitle>
            <AlertDialogDescription>
              {host
                ? `${city} goes live immediately at its preview URL, and ${host} is routed to it. The working draft is retired and this cannot be undone from here.`
                : `${city} goes live immediately at its preview URL only — no domain will be attached yet. The working draft is retired and this cannot be undone from here.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 sm:min-h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void publish()} className="min-h-11 sm:min-h-9">
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && <ErrorText>{error}</ErrorText>}
    </>
  )
}
