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
  /*
   * Own guard, in addition to the layout's — this is an admin-only screen
   * per src/lib/access.ts, and it holds a form that WRITES a city's
   * notification inbox list, so a demoted-mid-visit manager must not keep
   * reaching it through a soft navigation.
   */
  await requireAdmin()

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

  /*
   * The market's operator-entered facts. Unlike the notification inboxes
   * above, a failure to read these is NOT a reason to hide the form: a city
   * with no ops yet reads back as empty fields, which is the same thing an
   * unreadable one would show, and this screen is the only place they can be
   * entered at all. An unreachable city (neither draft nor document) is the
   * one case worth saying out loud, because saving would fail too.
   */
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
