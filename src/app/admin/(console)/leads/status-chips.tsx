import Link from 'next/link'
import { LEAD_STATUSES, type LeadQuery, type LeadStatusCounts } from '@/leads/types'
import { cn } from '@/lib/utils'
import { filterHref } from './logic'

// The pipeline as the primary filter: a count earns its place when it says how many rows the click would leave.
// Every stage rendered, zeros included, in pipeline order. Plain links, no hooks.

/** Pipeline order, and the wording the chips show. LEAD_STATUSES is the
 * source of the set; this only supplies capitalisation. */
const LABEL: Record<(typeof LEAD_STATUSES)[number], string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  booked: 'Booked',
  lost: 'Lost',
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

export function StatusChips({
  query,
  counts,
}: {
  query: LeadQuery
  counts: LeadStatusCounts
}) {
  const total = LEAD_STATUSES.reduce((sum, status) => sum + counts[status], 0)

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
      {/* explicit "All": an unlabelled toggle isn't discoverable */}
      <Chip
        href={filterHref(query, 'status', null)}
        label="All"
        count={total}
        active={query.status === null}
      />
      {LEAD_STATUSES.map((status) => (
        <Chip
          key={status}
          href={filterHref(query, 'status', status)}
          label={LABEL[status]}
          count={counts[status]}
          active={query.status === status}
        />
      ))}
    </div>
  )
}
