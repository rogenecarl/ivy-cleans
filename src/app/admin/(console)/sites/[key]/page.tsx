import Link from 'next/link'
import { ChevronLeft, TriangleAlert } from 'lucide-react'
import { getSiteSettings } from '@/leads/store'
import { readOpsLogic } from '@/pipeline/admin-logic'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { ADMIN_SITES } from '@/lib/admin-routes'
import { ErrorText, Panel } from '../../../ui'
import { OpsForm } from './ops-form'
import { SettingsForm } from './settings-form'
import { requireAdmin } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// Next 16: both params and searchParams are Promises and must be awaited.
export default async function SiteSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>
  searchParams: Promise<{ error?: string }>
}) {
  // own guard: admin-only, and this screen writes a city's inbox list
  await requireAdmin()

  const { key } = await params
  const { error } = await searchParams

  // getSiteSettings THROWING (unknown) is not null (no row yet). On a throw the form is hidden entirely: a pre-filled
  // empty textarea would wipe the real inbox list on save.
  let settings: Awaited<ReturnType<typeof getSiteSettings>> = null
  let settingsUnavailable = false
  try {
    settings = await getSiteSettings(key)
  } catch (err) {
    settingsUnavailable = true
    // loud, no addresses: this catch only wraps getSiteSettings
    console.error(
      `SiteSettingsPage: getSiteSettings(key) failed for city "${key}" -- settings are unavailable:`,
      err,
    )
  }

  // a failed ops read does not hide the form: empty fields read the same either way. An unreachable city is the one case worth saying.
  const ops = await readOpsLogic(key)

  return (
    <>
      <Link
        href={ADMIN_SITES}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-sm text-[0.85rem] text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Sites
      </Link>
      <h1 className="mt-2 mb-6 text-[1.4rem] font-semibold tracking-tight">{key} settings</h1>

      {error && <ErrorText>{error}</ErrorText>}

      <Panel title="Notification inboxes">
        {settingsUnavailable ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" aria-hidden="true" />
            <AlertTitle>Settings are unavailable.</AlertTitle>
            <AlertDescription>
              The leads store could not be reached, so this city&rsquo;s configured inboxes
              can&rsquo;t be confirmed. The form is hidden rather than shown empty, because
              saving an empty list here would overwrite a real, configured one. Check the
              database connection and reload before changing this city&rsquo;s notification
              inboxes.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Label htmlFor="emails" className="mb-1.5 block text-[0.8rem] font-semibold">
              One address per line. Every lead from this city is emailed to all of them.
            </Label>
            <SettingsForm cityKey={key} defaultValue={(settings?.notifyEmails ?? []).join('\n')} />
            <p className="mt-3 text-[0.8rem] text-muted-foreground">
              With no address here, leads are still saved but nobody is notified.
            </p>
          </>
        )}
      </Panel>

      <Panel title="What we know about this market">
        {ops.ok ? (
          <>
            <p className="mb-4 text-[0.8rem] text-muted-foreground">
              All optional. A competitor can describe the town; only you can say who cleans there,
              since when, and what a customer actually said &mdash; and a page that is given one of
              these facts is required to use it.
            </p>
            <OpsForm cityKey={key} fields={ops.fields} />
            <p className="mt-3 text-[0.8rem] text-muted-foreground">
              Saving changes what the NEXT generation is given. Pages already written still say what
              they said &mdash; regenerate the city to put a new fact into its copy.
            </p>
          </>
        ) : (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" aria-hidden="true" />
            <AlertTitle>This city has no draft or published document.</AlertTitle>
            <AlertDescription>
              There is nowhere to store market facts for &ldquo;{key}&rdquo; yet, so the form is
              hidden rather than shown ready to fail on save. Generate the city first.
            </AlertDescription>
          </Alert>
        )}
      </Panel>

      <Link
        href={ADMIN_SITES}
        className="inline-flex min-h-11 cursor-pointer items-center rounded-sm text-[0.85rem] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0"
      >
        Back to sites
      </Link>
    </>
  )
}
