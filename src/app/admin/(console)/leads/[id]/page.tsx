import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, TriangleAlert } from 'lucide-react'
import { getLead } from '@/leads/store'
import type { LeadRecord } from '@/leads/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ADMIN_BASE } from '@/lib/admin-routes'
import { LeadStatusChip, Panel, Pill } from '../../../ui'
import { LeadSubmission } from '../lead-submission'
import { NotesForm } from './notes-form'
import { StatusSelect } from './status-select'
import { requireSession } from '@/lib/auth-server'

// force-dynamic: a status change must show immediately. No generateMetadata: a lead's name is PII and must not
// end up in a title, URL or log.
export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // own guard: the most PII-dense screen in the console; React.cache shares the layout's lookup
  await requireSession()

  const { id } = await params

  // getLead() null (no such lead -> notFound) and getLead() THROWING (store unreachable, lead may exist) get distinct handling
  let lead: LeadRecord | null
  try {
    lead = await getLead(id)
  } catch (err) {
    // loud, no lead contents: this catch only wraps getLead
    console.error('LeadDetailPage: getLead(id) failed -- lead data is unavailable:', err)
    return (
      <>
        <div className="mb-6">
          <h1 className="text-[1.4rem] font-semibold tracking-tight">Lead</h1>
        </div>
        <Alert variant="destructive">
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertTitle>Lead data is unavailable.</AlertTitle>
          <AlertDescription>
            The leads store could not be reached, so this lead can&rsquo;t be confirmed to exist
            or not. Check the database connection and reload. Do not assume this lead was
            deleted or never existed.
          </AlertDescription>
        </Alert>
        <Link
          href={`${ADMIN_BASE}/leads`}
          className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-sm text-[0.85rem] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0"
        >
          Back to all leads
        </Link>
      </>
    )
  }
  if (!lead) notFound()

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.4rem] font-semibold tracking-tight">
            {lead.name ?? 'No name given'}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.85rem] text-muted-foreground">
            <Pill>{lead.cityKey.toUpperCase()}</Pill> <Pill>{lead.formType.toUpperCase()}</Pill>
            <span>{lead.submittedAt.toLocaleString()}</span>
            {lead.isTest && (
              <span className="font-semibold text-amber-700">
                preview submission, not a real customer
              </span>
            )}
          </p>
        </div>
        <LeadStatusChip status={lead.status} />
      </div>

      <Panel title="Submitted">
        <LeadSubmission lead={lead} />
      </Panel>

      <Panel title="Status">
        <StatusSelect id={lead.id} status={lead.status} />
      </Panel>

      <Panel title="Notes">
        <NotesForm id={lead.id} notes={lead.notes} />
      </Panel>

      <Panel title="Notification">
        <p className="text-[0.9rem]">
          Email status: <strong>{lead.emailStatus}</strong>
          {lead.emailError && <span className="ml-2 text-destructive">{lead.emailError}</span>}
        </p>
      </Panel>

      <Link
        href={`${ADMIN_BASE}/leads`}
        className="inline-flex min-h-11 cursor-pointer items-center rounded-sm text-[0.85rem] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to all leads
      </Link>
    </>
  )
}
