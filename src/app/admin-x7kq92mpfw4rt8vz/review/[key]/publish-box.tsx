'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { publishAction } from '../../actions'
import { BTN_PRIMARY, ErrorText, INPUT, LABEL } from '../../ui'

/*
 * Publish. Two irreversible-ish things happen at once (the city goes live and
 * its draft sidecar is retired), so there is a confirm() in front of it.
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
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState<{ domain: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function publish() {
    const host = domain.trim()
    const message = host
      ? `Publish ${city} and route ${host} to it?`
      : `Publish ${city} without a domain? It will be live at its preview URL only until a domain is added.`
    if (!window.confirm(message)) return

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
      <div className="rounded-md border border-[#a8d8ba] bg-[#e6f4ea] px-4 py-3 text-[0.85rem] text-[#106b35]">
        <p className="font-semibold">Live.</p>
        <p className="mt-1">
          Manual step: attach the domain to the Vercel project.
          {published.domain ? ` (${published.domain})` : ' No domain was set — add one later.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <label className={LABEL} htmlFor="domain">
        Domain
      </label>
      <input
        id="domain"
        className={INPUT}
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="miamicleans.com — leave blank to publish without a domain"
      />
      <p className="mt-1 text-[0.75rem] text-[#6b7680]">
        Routing only. The domain still has to be attached to the Vercel project by hand.
      </p>
      <button
        type="button"
        className={`${BTN_PRIMARY} mt-3`}
        disabled={publishing}
        onClick={() => void publish()}
      >
        {publishing ? 'Publishing…' : 'Publish'}
      </button>
      {error && <ErrorText>{error}</ErrorText>}
    </>
  )
}
