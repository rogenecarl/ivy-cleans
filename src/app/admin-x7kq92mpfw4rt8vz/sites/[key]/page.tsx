import Link from 'next/link'
import { getSiteSettings } from '@/leads/store'
import { ADMIN_BASE } from '../../base'
import { BTN_PRIMARY, ErrorText, INPUT, LABEL, Panel } from '../../ui'
import { saveNotifyEmailsAction } from '../site-actions'

export const dynamic = 'force-dynamic'

// Next 16: both params and searchParams are Promises and must be awaited.
export default async function SiteSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { key } = await params
  const { error } = await searchParams
  const settings = await getSiteSettings(key)

  return (
    <>
      <Link href={ADMIN_BASE} className="text-[0.85rem] text-[#6b7680] hover:underline">
        ← Cities
      </Link>
      <h1 className="mt-2 mb-6 text-[1.4rem] font-semibold tracking-tight">{key} settings</h1>

      {error && <ErrorText>{error}</ErrorText>}

      <Panel title="Notification inboxes">
        <form action={saveNotifyEmailsAction.bind(null, key)}>
          <label htmlFor="emails" className={LABEL}>
            One address per line. Every lead from this city is emailed to all of them.
          </label>
          <textarea
            id="emails"
            name="emails"
            rows={4}
            defaultValue={(settings?.notifyEmails ?? []).join('\n')}
            placeholder="miami@example.com"
            className={INPUT}
          />
          <button type="submit" className={`${BTN_PRIMARY} mt-3`}>
            Save
          </button>
        </form>
        <p className="mt-3 text-[0.8rem] text-[#6b7680]">
          With no address here, leads are still saved but nobody is notified.
        </p>
      </Panel>

      <Link href={ADMIN_BASE} className="text-[0.85rem] text-[#6b7680]">
        Back to sites
      </Link>
    </>
  )
}
