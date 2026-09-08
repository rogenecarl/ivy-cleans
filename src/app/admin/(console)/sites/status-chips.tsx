import Link from 'next/link'
import type { CityStatus } from '@/pipeline/admin-logic'
import { cn } from '@/lib/utils'
import { siteFilterHref, visibleStatuses, type SiteQuery } from './list-logic'

// Site status as the primary filter, mirroring the Leads chips. Only statuses worth showing render (visibleStatuses). Plain links.

const LABEL: Record<CityStatus, string> = {
  live: 'Live',
  draft: 'Draft',
  'draft-unfinalized': 'Needs finalize',
  generating: 'Generating',
  error: 'Error',
}

function Chip({
  href,
  label,
  count,
  active,
}: {
  href: string
  label: string
  count: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-[0.85rem] font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-9',
        active
          ? 'border-foreground/20 bg-foreground text-background'
          : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {label}
      <span
        className={cn(
          'rounded px-1.5 py-0.5 text-[0.75rem] tabular-nums',
          active ? 'bg-background/20' : 'bg-muted text-foreground',
        )}
      >
        {count}
      </span>
    </Link>
  )
}

export function SiteStatusChips({
  query,
  counts,
  total,
}: {
  query: SiteQuery
  counts: Record<CityStatus, number>
  total: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
      <Chip
        href={siteFilterHref(query, 'status', null)}
        label="All"
        count={total}
        active={query.status === null}
      />
      {visibleStatuses(counts, query.status).map((status) => (
        <Chip
          key={status}
          href={siteFilterHref(query, 'status', status)}
          label={LABEL[status]}
          count={counts[status]}
          active={query.status === status}
        />
      ))}
    </div>
  )
}
