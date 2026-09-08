'use server'
// Per-city notification settings (domain mapping lives elsewhere). Every input validated (./logic.ts), every action
// guarded — the layout guard doesn't run for an action POST. Addresses are never logged; only a count.
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { listCities, updateOpsLogic } from '@/pipeline/admin-logic'
import { upsertSiteSettings } from '@/leads/store'
import { ADMIN_BASE } from '@/lib/admin-routes'
import { requireAdmin } from '@/lib/auth-server'
import { parseNotifyEmails, parseOpsForm } from './logic'

export async function saveNotifyEmailsAction(cityKey: string, formData: FormData): Promise<void> {
  await requireAdmin()

  // `cityKey` is a bound argument (untrusted); validated against listCities() so a typo can't create a settings row for nothing
  const known = await listCities()
  if (!known.some((city) => city.key === cityKey)) {
    throw new Error(`unknown city "${cityKey}"`)
  }

  const result = parseNotifyEmails(formData.get('emails'))

  // absent/non-string is malformed, not "cleared": reject before upsertSiteSettings
  if (!result.ok) {
    throw new Error(result.reason)
  }

  await upsertSiteSettings(cityKey, result.emails)
  revalidatePath(`${ADMIN_BASE}/sites/${cityKey}`)
  revalidatePath(ADMIN_BASE)

  // only the error path redirects; revalidatePath is enough on success
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

// Saves market facts to the sidecar and/or document (works on a live city). REPLACES the whole ops block, so
// cityKey is checked against listCities() and parseOpsForm refuses an absent field. Reviews are never logged.
export async function saveOpsAction(cityKey: string, formData: FormData): Promise<void> {
  await requireAdmin()

  const known = await listCities()
  if (!known.some((city) => city.key === cityKey)) {
    throw new Error(`unknown city "${cityKey}"`)
  }

  const parsed = parseOpsForm(formData)
  if (!parsed.ok) {
    throw new Error(parsed.reason)
  }

  const result = await updateOpsLogic(cityKey, parsed.fields)

  if (!result.ok) {
    // A malformed review line lands here. It is the operator's own typing, so
    // it goes back to them on the screen rather than becoming a digest.
    redirect(`${ADMIN_BASE}/sites/${cityKey}?error=${encodeURIComponent(result.error)}`)
  }

  revalidatePath(`${ADMIN_BASE}/sites/${cityKey}`)
  revalidatePath(ADMIN_BASE)
}
