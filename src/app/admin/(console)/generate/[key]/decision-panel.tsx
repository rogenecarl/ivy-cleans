'use client'

import { ExternalLink } from 'lucide-react'
import type { UndecidedClaim } from '@/server/pipeline/admin-logic'
import { Button } from '@/components/ui/button'
import { ErrorText } from '@/app/admin/_components/ui'

const KIND: Record<string, string> = {
  area: 'Area',
  subdivision: 'Neighbourhood',
  housing: 'Homes',
  condition: 'Local condition',
  zip: 'ZIP code',
}

// The run waits here: each fact the check could not confirm is kept or dropped before any page is written.
export function DecisionPanel({
  claims,
  pendingId,
  error,
  onDecide,
}: {
  claims: UndecidedClaim[]
  pendingId: string | null
  error: string | null
  onDecide: (id: string, decision: 'keep' | 'drop') => void
}) {
  return (
    <section
      className="mb-4 rounded-md border border-amber-300 bg-amber-50/60 px-4 py-3"
      aria-labelledby="decisions-title"
      data-role="decisions"
    >
      <h2 id="decisions-title" className="text-[0.95rem] font-semibold">
        {claims.length === 1 ? '1 fact needs your decision' : `${claims.length} facts need your decision`}
      </h2>
      <p className="mt-0.5 text-[0.8rem] text-muted-foreground">
        The check couldn&rsquo;t confirm these from their sources. Keep one only if you know it&rsquo;s right; writing
        starts once each is decided.
      </p>
      <ul className="mt-3 divide-y divide-amber-200">
        {claims.map((claim) => (
          <li key={claim.id} className="flex flex-wrap items-start gap-3 py-2.5" data-role="decision">
            <div className="min-w-0 flex-[999_1_320px]">
              <p className="text-[0.9rem]">
                <span className="font-semibold">{claim.text}</span>
                <span className="ml-2 text-[0.75rem] text-muted-foreground">
                  {KIND[claim.kind] ?? claim.kind} · {claim.areaName ?? 'City-wide'}
                </span>
              </p>
              {claim.reason && <p className="mt-0.5 text-[0.8rem] text-amber-900">{claim.reason}</p>}
              {claim.sourceLinks.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {claim.sourceLinks.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[0.75rem] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        {link.title}
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 sm:min-h-9"
                disabled={pendingId !== null}
                onClick={() => onDecide(claim.id, 'keep')}
              >
                Keep
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 sm:min-h-9"
                disabled={pendingId !== null}
                onClick={() => onDecide(claim.id, 'drop')}
              >
                Drop
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error && <ErrorText>{error}</ErrorText>}
    </section>
  )
}
