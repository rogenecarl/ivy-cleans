import type { CityStatus } from '@/server/pipeline/admin-logic'
import { FilterChip as Chip } from '@/app/admin/_components/ui'
import { siteFilterHref, visibleStatuses, type SiteQuery } from './list-logic'

// Site status as the primary filter, mirroring the Leads chips. Only statuses worth showing render (visibleStatuses). Plain links.

const LABEL: Record<CityStatus, string> = {
  live: 'Live',
  draft: 'Draft',
  'draft-unfinalized': 'Needs finalize',
  generating: 'Generating',
  error: 'Error',
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
