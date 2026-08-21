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
 * Every export name and signature from the pre-shadcn version is kept as-is
 * on purpose: nine screens import from here and none of them are converted
 * in this stage. BTN / BTN_PRIMARY / INPUT / LABEL in particular are consumed
 * as `className={BTN}` on raw <button>/<a>/<input>/<label> elements in those
 * unconverted screens — they stay plain class strings (not shadcn components)
 * so those screens keep working unmodified until stages 2 and 3 migrate them
 * onto <Button>, <Input>, <Label> directly and delete these constants.
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

/** Shared button/link surface classes, so the two element types match.
 * Kept as plain class strings (not the <Button> component) because the
 * screens that use these apply them to raw <button> and <Link>/<a>
 * elements — see the file header. */
export const BTN =
  'inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs outline-none transition-all hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'

export const BTN_PRIMARY =
  'inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs outline-none transition-all hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'

/** Shared by <input> and <textarea>, so no fixed height (a `rows` textarea
 * in ../new/page.tsx and suburbs-editor.tsx would clip against one). */
export const INPUT =
  'w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20'

export const LABEL = 'mb-1 block text-[0.8rem] font-semibold text-foreground'

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
