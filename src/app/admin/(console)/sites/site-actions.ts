'use server'
/*
 * Per-city notification settings. The domain mapping is deliberately NOT here:
 * it belongs to the runtime-domain-map plan, which is where the host index
 * moves out of content/_domains.json.
 *
 * This action is as reachable as the page, whether or not the caller ever
 * loaded the settings screen -- the Next docs' "treat every action as an
 * untrusted entry point" warning, the same one lead-actions.ts documents for
 * its own mutations. Two things follow, and BOTH are needed: every input is
 * validated (see ./logic.ts) so a malformed or hostile POST cannot write junk
 * or wipe a city's inbox list, and this function starts with a guard from
 * src/lib/auth-server.ts. The (console) layout's guard does NOT cover this --
 * a layout does not run for an action POST.
 *
 * Addresses themselves are never written to a log or included in the
 * redirect -- only a count -- so this path does not leak submitted PII into
 * server logs or browser history.
 */
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { listCities } from '@/pipeline/admin-logic'
import { upsertSiteSettings } from '@/leads/store'
import { ADMIN_BASE } from '@/lib/admin-routes'
import { requireAdmin } from '@/lib/auth-server'
import { parseNotifyEmails } from './logic'

export async function saveNotifyEmailsAction(cityKey: string, formData: FormData): Promise<void> {
  await requireAdmin()

  /*
   * `cityKey` is a bound argument, which round-trips through the client and
   * is therefore untrusted -- and it was previously written straight into a
   * SiteSettings row with no check at all. /sites/<anything> renders a
   * working form, so a typo (or a hostile POST) created a settings row for a
   * city that does not exist: invisible on the Sites table, never read by any
   * submission, and quietly diverging from the operator's belief that they
   * had configured an inbox.
   *
   * Validated against listCities(), the same list the Sites table itself is
   * built from -- so every row the operator can actually click is accepted,
   * drafts and mid-pipeline cities included, and nothing else is.
   */
  const known = await listCities()
  if (!known.some((city) => city.key === cityKey)) {
    throw new Error(`unknown city "${cityKey}"`)
  }

  const result = parseNotifyEmails(formData.get('emails'))

  // An absent/non-string field is a malformed request, not "the operator
  // cleared the list" -- reject it before it ever reaches upsertSiteSettings,
  // so a bad POST cannot wipe a city's notification inbox. (Task 11's
  // saveNotesAction draws the same line for the notes field.)
  if (!result.ok) {
    throw new Error(result.reason)
  }

  await upsertSiteSettings(cityKey, result.emails)
  revalidatePath(`${ADMIN_BASE}/sites/${cityKey}`)
  revalidatePath(ADMIN_BASE)

  // Only the error path redirects. On success the form posts back to the same
  // route, and revalidatePath above is enough to show the saved list — an
  // unconditional redirect here would be a no-op navigation, same as every
  // other in-place save in this admin (see updateSuburbsAction).
  if (result.invalidCount > 0) {
    const noun = result.invalidCount === 1 ? 'entry' : 'entries'
    const verb = result.invalidCount === 1 ? 'was' : 'were'
    redirect(
      `${ADMIN_BASE}/sites/${cityKey}?error=${encodeURIComponent(
        `${result.invalidCount} ${noun} ${verb} not saved (not a valid email address, or over the per-save limit).`,
      )}`,
    )
  }
}
