import type { ReactNode } from 'react'
import { TriangleAlert, type LucideIcon } from 'lucide-react'
import type { CityStatus } from '@/pipeline/admin-logic'
import type { LeadStatus } from '@/leads/types'
import type { Readiness, ReadinessProblem } from '@/leads/readiness'
import { Badge, type badgeVariants } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { VariantProps } from 'class-variance-authority'

/*
 * Presentational scraps shared by the admin screens, re-implemented on top of
 * shadcn/ui (Stage 1 of the redesign). Server-safe (no hooks, no event
 * handlers) so both server and client components can render them.
 *
 * Stage 3 finished the migration onto real shadcn components: every screen
 * now uses <Button>, <Input>, <Label> directly, and the BTN / BTN_PRIMARY /
 * INPUT / LABEL plain-class-string constants that used to keep unconverted
 * screens rendering during the staged migration are gone. Nothing in this
 * file should go back to a class-string export — a future screen should use
 * the shadcn components, not reintroduce that pattern.
 */

type BadgeVariant = VariantProps<typeof badgeVariants>['variant']

const CHIP: Record<CityStatus, { label: string; variant: BadgeVariant }> = {
  live: { label: 'LIVE', variant: 'success' },
  draft: { label: 'DRAFT', variant: 'warning' },
  generating: { label: 'GENERATING', variant: 'info' },
  'draft-unfinalized': { label: 'NEEDS FINALIZE', variant: 'info' },
  error: { label: 'ERROR', variant: 'danger' },
}

const CHIP_CLASS = 'px-2.5 text-[0.7rem] font-semibold tracking-wide'

export function StatusChip({ status }: { status: CityStatus }) {
  const chip = CHIP[status]
  return (
    <Badge variant={chip.variant} className={CHIP_CLASS}>
      {chip.label}
    </Badge>
  )
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="mb-6 gap-3 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-[1rem]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  )
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <Alert variant="destructive" className="mt-2 px-3 py-2">
      <AlertDescription className="text-[0.8rem] text-destructive">{children}</AlertDescription>
    </Alert>
  )
}

const LEAD_CHIP: Record<LeadStatus, { label: string; variant: BadgeVariant }> = {
  new: { label: 'NEW', variant: 'info' },
  contacted: { label: 'CONTACTED', variant: 'warning' },
  quoted: { label: 'QUOTED', variant: 'plum' },
  booked: { label: 'BOOKED', variant: 'success' },
  lost: { label: 'LOST', variant: 'secondary' },
}

export function LeadStatusChip({ status }: { status: LeadStatus }) {
  const chip = LEAD_CHIP[status]
  return (
    <Badge variant={chip.variant} className={CHIP_CLASS}>
      {chip.label}
    </Badge>
  )
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <Badge variant="secondary" className="rounded px-1.5 text-[0.65rem] font-semibold">
      {children}
    </Badge>
  )
}

const PROBLEM_LABEL: Record<ReadinessProblem, string> = {
  'no-domain': 'NO DOMAIN',
  'no-inbox': 'NO INBOX',
  'email-failures': 'EMAIL FAILURES',
}

/** Human wording for a readiness problem, shared by the marker below and by
 * anything that needs to name one in prose. */
export function readinessProblemLabel(problem: ReadinessProblem): string {
  return PROBLEM_LABEL[problem]
}

/**
 * The inline "something is wrong with this site" marker.
 *
 * Replaced a whole Config column of READY/NO INBOX chips. That column spent a
 * column's width to say "READY" on every row, and said it WRONGLY on drafts --
 * siteReadiness() exempts an unlaunched city from the domain and inbox checks,
 * so a draft with nothing configured scored zero problems and rendered READY,
 * which reads as "ready to go live" when it means "nothing has been checked
 * yet". NO DOMAIN also duplicated the Domain column two cells to its left.
 *
 * What was worth keeping is the signal itself, because the list sorts sites
 * with problems to the top -- without a visible marker that ordering looks
 * arbitrary. Renders nothing at all when there is nothing wrong, so a healthy
 * table is completely quiet.
 */
export function ReadinessMarker({ readiness }: { readiness: Readiness | null }) {
  if (readiness === null || readiness.problems.length === 0) return null
  const names = readiness.problems.map(PROBLEM_LABEL_TITLE).join(' · ')
  return (
    <span
      className="ml-2 inline-flex items-center gap-1 align-middle text-[0.7rem] font-semibold text-destructive"
      title={names}
    >
      <TriangleAlert className="size-3.5" aria-hidden="true" />
      <span className="sr-only">Problem: </span>
      {readiness.problems.map((p) => PROBLEM_LABEL[p]).join(' · ')}
    </span>
  )
}

/** Sentence-case wording for the title attribute, where SHOUTING reads badly. */
function PROBLEM_LABEL_TITLE(problem: ReadinessProblem): string {
  if (problem === 'no-domain') return 'No domain attached'
  if (problem === 'no-inbox') return 'No notification inbox configured, so leads reach nobody'
  return 'Some notification emails failed to send'
}

/**
 * Designed empty state (Stage 2): an icon, one line of explanation, and an
 * optional action -- for a table/list that has zero rows, as distinct from
 * ErrorText/Alert above, which is for "the data couldn't be read at all."
 * This dashboard starts empty and stays sparse, so "no rows" grey text is
 * not an acceptable substitute here.
 *
 * `action` is a ReactNode (typically a <Link>), not an onClick prop, so this
 * stays server-safe like every other export in this file -- a page can drop
 * it in without becoming a client component.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-[0.95rem] font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-sm text-[0.85rem] text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

/**
 * One headline number, with an optional line of context under it.
 *
 * `hint` is not decoration. "3 waiting" and "3 waiting, oldest 4 hr" lead to
 * different actions, and a rate without its denominator ("57%") invites a
 * confidence that "4 of 7 decided" correctly withholds. Every figure that can
 * mislead on its own carries the thing that stops it.
 *
 * `tone` is what makes the alarm row readable at a glance: an alarm tile is
 * only coloured when the number is actually non-zero, so a healthy dashboard
 * is uniformly quiet and any colour at all means something needs attention.
 * Never colour a zero -- an always-red tile is one nobody reads.
 */
export function StatPill({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: LucideIcon
  label: string
  /** A string, not just a number, so a tile can show "—" for "no data yet"
   * instead of a 0 that would read as a real measurement. */
  value: number | string
  hint?: string
  tone?: 'default' | 'alarm' | 'good'
}) {
  const alarm = tone === 'alarm'
  const good = tone === 'good'
  return (
    <div
      className={
        alarm
          ? 'rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 py-3'
          : 'rounded-lg border border-border bg-card px-3.5 py-3'
      }
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={
            alarm
              ? 'flex size-9 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive'
              : good
                ? 'flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700'
                : 'flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground'
          }
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[0.75rem] font-medium text-muted-foreground">{label}</p>
          <p
            className={
              alarm
                ? 'text-[1.25rem] leading-tight font-semibold text-destructive tabular-nums'
                : 'text-[1.25rem] leading-tight font-semibold tabular-nums'
            }
          >
            {value}
          </p>
        </div>
      </div>
      {hint && <p className="mt-1.5 truncate text-[0.75rem] text-muted-foreground">{hint}</p>}
    </div>
  )
}
