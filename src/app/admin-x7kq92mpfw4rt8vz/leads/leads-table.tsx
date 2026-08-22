'use client'

/*
 * The Leads list, as a master-detail: scan the table, click a row, read the
 * whole submission in a sheet without losing your place in the list.
 *
 * Laid out after the operator's other admin (peaktransport's Applications
 * screen): one bordered card holding a header bar of controls, the table, and
 * a paged footer -- so the filters visibly belong to the table they filter
 * instead of floating above it.
 *
 * WHY THE ROWS CARRY PRE-RENDERED TIME STRINGS. This is a client component,
 * so anything derived from `Date.now()` or `toLocaleString()` here would be
 * computed once on the server and again in the browser -- different clock,
 * different timezone, hydration mismatch. The server builds
 * `submittedLabel`/`submittedExact` in page.tsx and passes them down as
 * plain strings, so both renders are identical by construction.
 *
 * The sheet does not replace /leads/<id>. That page is what the notification
 * email links to (see (sites)/[city]/lead-actions.ts), so it stays, and both
 * render the same <LeadSubmission> -- see lead-submission.tsx.
 */
import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ExternalLink, Inbox, Search, SearchX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { LeadRecord } from '@/leads/types'
import { ADMIN_BASE } from '../base'
import { EmptyState, LeadStatusChip, Pill } from '../ui'
import { LeadSubmission, leadHeadline } from './lead-submission'
import { NotesForm } from './[id]/notes-form'
import { StatusSelect } from './[id]/status-select'

/** Matches peaktransport's Applications table. The store already caps a read
 * at 200 rows, so this pages what is in hand rather than re-querying. */
const PAGE_SIZE = 50

export type LeadRow = {
  lead: LeadRecord
  cityName: string
  /** "5 min ago" -- computed on the server, see the file header. */
  submittedLabel: string
  /** Full timestamp, for the title attribute. Also server-computed. */
  submittedExact: string
}

/** Two-letter monogram for the row avatar. Falls back to a dash rather than
 * rendering an empty circle for a lead that arrived with no name. */
function initials(name: string | null): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function LeadsTable({
  rows,
  filters,
  filtersActive,
}: {
  rows: LeadRow[]
  /** The URL-backed filter controls, rendered by the server page and placed
   * in this card's header bar. */
  filters: ReactNode
  filtersActive: boolean
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  /*
   * Client-side, over the rows already loaded, deliberately: the URL filters
   * (city/status/form) go through the database because they change what is
   * fetched, but "find Jane" is a scan of what is already on screen and
   * should not cost a round trip.
   */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q === '') return rows
    return rows.filter(({ lead, cityName }) =>
      [lead.name, lead.email, lead.phone, cityName, leadHeadline(lead)]
        .filter((v): v is string => typeof v === 'string' && v !== '')
        .some((v) => v.toLowerCase().includes(q)),
    )
  }, [rows, search])

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  // Clamped rather than stored blindly: deleting or filtering rows can strand
  // `page` past the end, and a page number with no rows reads as "no leads".
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const paged = visible.slice(start, start + PAGE_SIZE)

  // Read from `rows`, not `visible`: typing in the search box must never
  // yank the open sheet out from under the operator mid-read.
  const selected = useMemo(
    () => rows.find((r) => r.lead.id === selectedId) ?? null,
    [rows, selectedId],
  )

  const searching = search.trim() !== ''

  function changeSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Header bar: the controls sit with the table they act on. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[0.95rem] font-semibold">All leads</h2>
            {filters}
          </div>
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => changeSearch(e.target.value)}
              placeholder="Search name, email, phone, city"
              aria-label="Search leads"
              className="pl-9"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={searching || filtersActive ? SearchX : Inbox}
              title={
                searching
                  ? 'No leads match this search'
                  : filtersActive
                    ? 'No leads match these filters'
                    : 'No leads yet'
              }
              description={
                searching
                  ? 'Try a shorter search, or clear it to see every lead again.'
                  : filtersActive
                    ? 'Try widening or clearing a filter above.'
                    : 'Submissions from every city’s booking and contact forms will show up here.'
              }
              action={
                searching ? (
                  <Button variant="outline" size="sm" onClick={() => changeSearch('')}>
                    Clear search
                  </Button>
                ) : filtersActive ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`${ADMIN_BASE}/leads`}>Clear filters</Link>
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Wants</TableHead>
                    <TableHead className="hidden lg:table-cell">City / Form</TableHead>
                    <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map(({ lead, cityName, submittedLabel, submittedExact }) => (
                    <TableRow
                      key={lead.id}
                      onClick={() => setSelectedId(lead.id)}
                      data-state={lead.id === selectedId ? 'selected' : undefined}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[0.7rem] font-semibold text-muted-foreground"
                          >
                            {initials(lead.name)}
                          </span>
                          <span className="min-w-0">
                            {/* The real keyboard target. The row's onClick is
                              * a mouse convenience on top of it, so the list
                              * stays operable by Tab + Enter. */}
                            <button
                              type="button"
                              onClick={() => setSelectedId(lead.id)}
                              className="block max-w-full cursor-pointer truncate rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                              {lead.name ?? 'No name given'}
                            </button>
                            <span className="block truncate text-[0.75rem] text-muted-foreground">
                              {lead.email ?? lead.phone ?? 'No contact info'}
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[18rem] text-[0.85rem]">
                        <span className="block truncate" title={leadHeadline(lead) ?? undefined}>
                          {leadHeadline(lead) ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="flex flex-wrap items-center gap-1 text-[0.8rem] text-muted-foreground">
                          <Pill>{cityName}</Pill>
                          <Pill>{lead.formType.toUpperCase()}</Pill>
                          {lead.isTest && <Pill>TEST</Pill>}
                          {lead.emailStatus === 'failed' && (
                            <Badge variant="danger" className="text-[0.65rem]">
                              email not sent
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell
                        className="hidden text-[0.75rem] whitespace-nowrap text-muted-foreground lg:table-cell"
                        title={submittedExact}
                      >
                        {submittedLabel}
                      </TableCell>
                      <TableCell>
                        <LeadStatusChip status={lead.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-3 p-4 md:hidden">
              {paged.map(({ lead, cityName, submittedLabel }) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setSelectedId(lead.id)}
                  className="flex cursor-pointer flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{lead.name ?? 'No name given'}</span>
                    <LeadStatusChip status={lead.status} />
                  </span>
                  <span className="text-[0.85rem] text-muted-foreground">
                    {leadHeadline(lead) ?? '—'}
                  </span>
                  <span className="flex flex-wrap items-center gap-1 text-[0.8rem] text-muted-foreground">
                    <Pill>{cityName}</Pill>
                    <Pill>{lead.formType.toUpperCase()}</Pill>
                    {lead.isTest && <Pill>TEST</Pill>}
                  </span>
                  <span className="flex items-center justify-between gap-2 text-[0.85rem]">
                    <span>{lead.email ?? lead.phone ?? 'No contact info'}</span>
                    <span className="text-[0.75rem] whitespace-nowrap text-muted-foreground">
                      {submittedLabel}
                    </span>
                  </span>
                  {lead.emailStatus === 'failed' && (
                    <Badge variant="danger" className="w-fit text-[0.65rem]">
                      email not sent
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-[0.8rem] text-muted-foreground">
                Showing {start + 1}–{start + paged.length} of {visible.length}
              </p>
              {pageCount > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <span className="text-[0.8rem] text-muted-foreground">
                    Page {currentPage} of {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader className="border-b border-border">
                <SheetTitle className="text-[1.05rem]">
                  {selected.lead.name ?? 'No name given'}
                </SheetTitle>
                <SheetDescription asChild>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Pill>{selected.cityName}</Pill>
                    <Pill>{selected.lead.formType.toUpperCase()}</Pill>
                    <LeadStatusChip status={selected.lead.status} />
                    <span className="text-[0.8rem]">{selected.submittedExact}</span>
                  </span>
                </SheetDescription>
                {selected.lead.isTest && (
                  <span className="text-[0.8rem] font-semibold text-amber-700">
                    Preview submission, not a real customer.
                  </span>
                )}
              </SheetHeader>

              <div className="space-y-6 px-4 py-5">
                <LeadSubmission lead={selected.lead} />

                <div>
                  <h3 className="mb-2.5 text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
                    Status
                  </h3>
                  <StatusSelect id={selected.lead.id} status={selected.lead.status} />
                </div>

                <div>
                  <h3 className="mb-2.5 text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
                    Notes
                  </h3>
                  {/* key: remounts the form when a different lead is opened,
                    * so the textarea's defaultValue is re-read instead of
                    * showing the previous lead's notes. */}
                  <NotesForm
                    key={selected.lead.id}
                    id={selected.lead.id}
                    notes={selected.lead.notes}
                  />
                </div>

                <div>
                  <h3 className="mb-2.5 text-[0.7rem] font-medium tracking-widest text-muted-foreground uppercase">
                    Notification
                  </h3>
                  <p className="text-[0.85rem]">
                    Email status: <strong>{selected.lead.emailStatus}</strong>
                    {selected.lead.emailError && (
                      <span className="ml-2 text-destructive">{selected.lead.emailError}</span>
                    )}
                  </p>
                </div>

                <Link
                  href={`${ADMIN_BASE}/leads/${selected.lead.id}`}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm text-[0.85rem] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-9"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                  Open as a full page
                </Link>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
