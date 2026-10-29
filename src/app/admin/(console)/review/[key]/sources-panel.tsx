import { ExternalLink } from 'lucide-react'
import type { ResearchClaim } from '@/server/pipeline/claims'
import type { ResearchSource } from '@/server/pipeline/sources'

// Read-only: every research fact, its check result and the pages it came from. Decisions happen before writing,
// on the generate screen; this is the record of them.

const STATUS: Record<ResearchClaim['status'], { label: string; tone: string }> = {
  confirmed: { label: 'Confirmed', tone: 'bg-green-50 text-green-800 border-green-600/30' },
  kept: { label: 'Kept by you', tone: 'bg-green-50 text-green-800 border-green-600/30' },
  unchecked: { label: 'Not printed', tone: 'bg-muted text-muted-foreground border-border' },
  pending: { label: 'Not checked yet', tone: 'bg-muted text-muted-foreground border-border' },
  unconfirmed: { label: 'Needs a decision', tone: 'bg-amber-50 text-amber-900 border-amber-600/30' },
  wrong: { label: 'Wrong — left out', tone: 'bg-red-50 text-red-800 border-red-600/30' },
  dropped: { label: 'Dropped by you', tone: 'bg-red-50 text-red-800 border-red-600/30' },
}

const KIND: Record<ResearchClaim['kind'], string> = {
  area: 'Area',
  subdivision: 'Neighbourhood',
  housing: 'Homes',
  condition: 'Condition',
  zip: 'ZIP',
}

export function SourcesPanel({
  claims,
  sources,
  areaNames,
}: {
  claims: ResearchClaim[] | undefined
  sources: ResearchSource[] | undefined
  areaNames: Record<string, string>
}) {
  if (!claims?.length) {
    return (
      <p className="text-[0.85rem] text-muted-foreground" data-role="sources-legacy">
        Researched before fact checking existed — regenerate research to check it.
      </p>
    )
  }
  const byId = new Map((sources ?? []).map((s) => [s.id, s]))
  const groups = new Map<string, ResearchClaim[]>()
  for (const c of claims) {
    const key = c.area ?? ''
    groups.set(key, [...(groups.get(key) ?? []), c])
  }
  const checked = claims.filter((c) => c.status !== 'unchecked')
  const confirmed = checked.filter((c) => c.status === 'confirmed' || c.status === 'kept').length

  return (
    <div data-role="sources">
      <p className="mb-3 text-[0.85rem] text-muted-foreground">
        {confirmed} of {checked.length} facts confirmed or kept · {byId.size} sources
      </p>
      {[...groups.entries()].map(([area, list]) => (
        <section key={area || 'city'} className="border-t border-border/60 py-2">
          <h3 className="mb-1 text-[0.85rem] font-semibold">{area ? (areaNames[area] ?? area) : 'City-wide'}</h3>
          <ul className="space-y-1.5">
            {list.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.85rem]">
                <span className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{KIND[c.kind]}</span>
                <span className="min-w-0">{c.text}</span>
                <span className={`rounded-full border px-2 py-px text-[0.7rem] font-semibold ${STATUS[c.status].tone}`}>
                  {STATUS[c.status].label}
                </span>
                {c.reason && <span className="w-full text-[0.75rem] text-muted-foreground">{c.reason}</span>}
                {c.sources.map((id) => {
                  const s = byId.get(id)
                  return s ? (
                    <a
                      key={id}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[0.75rem] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      {s.title}
                      <ExternalLink className="size-3" aria-hidden="true" />
                    </a>
                  ) : null
                })}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
