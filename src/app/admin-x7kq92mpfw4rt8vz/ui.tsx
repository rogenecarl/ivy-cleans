import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
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

/** Launch-readiness for a single Sites row: one green chip when everything
 * checks out, or one red chip per unmet condition when it does not. */
export function ReadinessChips({ readiness }: { readiness: Readiness }) {
  if (readiness.ready) {
    return (
      <Badge variant="success" className={CHIP_CLASS}>
        READY
      </Badge>
    )
  }
  return (
    <span className="flex flex-wrap gap-1">
      {readiness.problems.map((problem) => (
        <Badge key={problem} variant="danger" className={CHIP_CLASS}>
          {PROBLEM_LABEL[problem]}
        </Badge>
      ))}
    </span>
  )
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
