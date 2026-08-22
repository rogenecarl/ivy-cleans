import Link from 'next/link'
import { ChevronLeft, TriangleAlert } from 'lucide-react'
import { getSiteSettings } from '@/leads/store'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { ADMIN_SITES } from '../../base'
import { ErrorText, Panel } from '../../ui'
import { SettingsForm } from './settings-form'

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

  /*
   * getSiteSettings THROWING is not the same as it resolving to null (a city
   * with no settings row yet, i.e. genuinely zero configured inboxes) --
   * only the throw case means "we don't actually know what's configured
   * here." Scoped to exactly this call, matching the other three screens.
   *
   * The distinction matters more on THIS screen than the others: it holds a
   * form that WRITES notifyEmails. If settings can't be read, the form must
   * not render pre-filled with an empty textarea -- saving that would wipe
   * the city's real inbox list, and the operator would believe they were
   * clearing an empty list when they were actually destroying a configured
   * one. Same destructive-write shape as the malformed-POST cases already
   * fixed in the actions (lead-actions.ts, site-actions.ts), just arriving
   * through the UI instead. Chose to hide the form ENTIRELY rather than
   * render it disabled: a disabled form still shows a specific (wrong, or
   * at best unknown) address list as if it were the true one, which invites
   * the same misreading even if it can't be submitted. An absent form has
   * no address list to misread.
   */
  let settings: Awaited<ReturnType<typeof getSiteSettings>> = null
  let settingsUnavailable = false
  try {
    settings = await getSiteSettings(key)
  } catch (err) {
    settingsUnavailable = true
    // Loud on purpose, no email addresses logged: this catch wraps only the
    // getSiteSettings call above, so whatever it caught is a
    // connection/query failure, never the row's notifyEmails contents.
    console.error(
      `SiteSettingsPage: getSiteSettings(key) failed for city "${key}" -- settings are unavailable:`,
      err,
    )
  }

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

      <Link
        href={ADMIN_SITES}
        className="inline-flex min-h-11 cursor-pointer items-center rounded-sm text-[0.85rem] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0"
      >
        Back to sites
      </Link>
    </>
  )
}
