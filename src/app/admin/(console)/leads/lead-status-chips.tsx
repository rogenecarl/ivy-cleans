import { LEAD_STATUSES, type LeadQuery, type LeadStatusCounts } from '@/server/leads/types'
import { FilterChip as Chip } from '@/app/admin/_components/ui'
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
