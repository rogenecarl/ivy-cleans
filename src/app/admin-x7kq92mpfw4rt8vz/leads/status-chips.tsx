import Link from 'next/link'
import { LEAD_STATUSES, type LeadQuery, type LeadStatusCounts } from '@/leads/types'
import { cn } from '@/lib/utils'
import { filterHref } from './logic'

/*
 * The pipeline, as the primary filter control.
 *
 * These replaced a row of read-only stat tiles. As decoration a count is hard
 * to justify -- "Lost 0" tells an operator with two leads nothing -- but as
 * the thing you click to narrow the list, the same number earns its place: it
 * says how many rows the filter would leave. That also retired the separate
 * Status dropdown, which did the identical job with none of the counts.
 *
 * Every stage is rendered, zeros included, and in pipeline order rather than
 * by size. A gap where "Quoted" should be would be read as "no such stage" --
 * which is exactly the bug this replaced, where quoted leads were folded into
 * a "Need action" roll-up and appeared nowhere of their own.
 *
 * Server-safe: plain links, no hooks. The filters live in the URL, so a
 * filtered view stays bookmarkable and the back button works.
 */

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
      {/* "All" is explicit rather than relying on clicking the active chip to
        * toggle it off -- an unlabelled toggle is not discoverable, and an
        * operator who has filtered to Lost needs an obvious way back. */}
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
