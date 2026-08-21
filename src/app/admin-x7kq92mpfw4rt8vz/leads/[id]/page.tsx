import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLead } from '@/leads/store'
import { LEAD_STATUSES, type LeadRecord } from '@/leads/types'
import { ADMIN_BASE } from '../../base'
import { BTN_PRIMARY, INPUT, LeadStatusChip, Panel, Pill } from '../../ui'
import { saveNotesAction, setStatusAction } from '../lead-actions'

/*
 * force-dynamic for the same reason the list uses it: a status change or a
 * saved note must show up the moment the operator makes it, not on the next
 * cold build.
 *
 * No generateMetadata here on purpose -- the layout's fixed
 * "Ivy Cleans: Site Manager" title covers this route, and a lead's name is
 * customer PII that must never end up in a page title, a URL, or a log line.
 */
export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  /*
   * getLead() returning null and getLead() THROWING are different answers
   * and must not collapse into the same UI. null means "no lead with this
   * id" -- notFound() is correct. A throw means the store could not even be
   * asked -- the database may be briefly unreachable, and the lead may well
   * exist. Telling an operator "this lead does not exist" when the truth is
   * "the database was unreachable" is the kind of wrong answer that gets a
   * real lead abandoned, so the two cases get distinct handling below.
   * Scoped to exactly this call, matching the Sites and Leads-list screens.
   */
  let lead: LeadRecord | null
  try {
    lead = await getLead(id)
  } catch (err) {
    // Loud on purpose, no lead contents: this catch wraps only the getLead
    // call above, so whatever it caught is a connection/query failure, never
    // a row's data -- safe to log in full.
    console.error('LeadDetailPage: getLead(id) failed -- lead data is unavailable:', err)
    return (
      <>
        <div className="mb-6">
          <h1 className="text-[1.4rem] font-semibold tracking-tight">Lead</h1>
        </div>
        <div
          role="alert"
          className="rounded-lg border border-[#f3b4b4] bg-[#fdecec] px-4 py-6 text-[0.9rem] text-[#7a1414]"
        >
          <p className="font-semibold">Lead data is unavailable.</p>
          <p className="mt-1 text-[0.85rem]">
            The leads store could not be reached, so this lead can&rsquo;t be confirmed to exist
            or not. Check the database connection and reload — do not assume this lead was
            deleted or never existed.
          </p>
        </div>
        <Link
          href={`${ADMIN_BASE}/leads`}
          className="mt-4 inline-block text-[0.85rem] text-[#6b7680]"
        >
          Back to all leads
        </Link>
      </>
    )
  }
  if (!lead) notFound()

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[1.4rem] font-semibold tracking-tight">
            {lead.name ?? 'No name given'}
          </h1>
          <p className="mt-1 text-[0.85rem] text-[#6b7680]">
            <Pill>{lead.cityKey.toUpperCase()}</Pill> <Pill>{lead.formType.toUpperCase()}</Pill>{' '}
            {lead.submittedAt.toLocaleString()}
            {lead.isTest && (
              <span className="ml-2 font-semibold text-[#8a5300]">preview submission, not a real customer</span>
            )}
          </p>
        </div>
        <LeadStatusChip status={lead.status} />
      </div>

      <Panel title="Submitted">
        <dl className="text-[0.9rem]">
          {Object.entries(lead.payload)
            .filter(([, value]) => value.trim() !== '')
            .map(([label, value]) => (
              <div key={label} className="flex gap-3 border-b border-[#e6eaee] py-1.5 last:border-b-0">
                <dt className="min-w-[16rem] text-[0.8rem] text-[#6b7680]">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      </Panel>

      <Panel title="Status">
        <div className="flex flex-wrap gap-2">
          {LEAD_STATUSES.map((status) => (
            <form key={status} action={setStatusAction.bind(null, lead.id, status)}>
              <button
                type="submit"
                disabled={status === lead.status}
                className={`rounded-full border px-3 py-1 text-[0.8rem] capitalize ${
                  status === lead.status
                    ? 'border-[#f0cf9a] bg-[#fff4e5] font-semibold text-[#8a5300]'
                    : 'border-[#c3cbd3] bg-white text-[#4a545d] hover:bg-[#eef1f4]'
                }`}
              >
                {status}
              </button>
            </form>
          ))}
        </div>
      </Panel>

      <Panel title="Notes">
        <form action={saveNotesAction.bind(null, lead.id)}>
          <textarea
            name="notes"
            rows={4}
            defaultValue={lead.notes}
            placeholder="What happened on the call"
            className={INPUT}
          />
          <button type="submit" className={`${BTN_PRIMARY} mt-3`}>
            Save notes
          </button>
        </form>
      </Panel>

      <Panel title="Notification">
        <p className="text-[0.9rem]">
          Email status: <strong>{lead.emailStatus}</strong>
          {lead.emailError && <span className="ml-2 text-[#a11212]">{lead.emailError}</span>}
        </p>
      </Panel>

      <Link href={`${ADMIN_BASE}/leads`} className="text-[0.85rem] text-[#6b7680]">
        Back to all leads
      </Link>
    </>
  )
}
