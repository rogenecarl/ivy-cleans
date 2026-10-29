'use server'
// Per-city notification settings (domain mapping lives elsewhere). Every input validated (./logic.ts), every action
// guarded — the layout guard doesn't run for an action POST. Addresses are never logged; only a count.
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  addPhotoLogic,
  listCities,
  removeAboutStoryLogic,
  removePhotoLogic,
  savePhotoCaptionsLogic,
  updateContactLogic,
  updateOpsLogic,
  writeAboutStoryLogic,
  type ActionResult,
} from '@/server/pipeline/admin-logic'
import { upsertSiteSettings } from '@/server/leads/store'
import { ADMIN_BASE } from '@/server/auth/admin-routes'
import { requireAdmin } from '@/server/auth/auth-server'
import { parseNotifyEmails, parseOpsForm } from './logic'

export async function saveNotifyEmailsAction(cityKey: string, formData: FormData): Promise<void> {
  await requireAdmin()

  // `cityKey` is a bound argument (untrusted); checked so a typo can't create a settings row for nothing
  await requireKnownCity(cityKey)

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
  await requireKnownCity(cityKey)

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

  revalidateAbout(cityKey)
}

// Phone and street address. The phone is printed on every page of the city, so the whole tree is revalidated.
export async function saveContactAction(cityKey: string, formData: FormData): Promise<void> {
  await requireAdmin()
  await requireKnownCity(cityKey)

  const phone = formData.get('phone')
  const address = formData.get('address')
  if (typeof phone !== 'string' || typeof address !== 'string') throw new Error('the contact form is missing a field')

  const result = await updateContactLogic(cityKey, { phone, address })
  if (!result.ok) redirect(`${ADMIN_BASE}/sites/${cityKey}?error=${encodeURIComponent(result.error)}`)

  revalidatePath(`${ADMIN_BASE}/sites/${cityKey}`)
  revalidatePath('/', 'layout')
}

// the Settings screen and the public About Us page both read the ops block
function revalidateAbout(cityKey: string): void {
  revalidatePath(`${ADMIN_BASE}/sites/${cityKey}`)
  revalidatePath(ADMIN_BASE)
  revalidatePath(`/${cityKey}/about`)
  revalidatePath(`/${cityKey}`)
  revalidatePath(`/${cityKey}/[slug]`, 'page')
}

async function requireKnownCity(cityKey: string): Promise<void> {
  const known = await listCities()
  if (!known.some((city) => city.key === cityKey)) throw new Error(`unknown city "${cityKey}"`)
}

/** One file, one caption, a result the caller shows in place. The drop zone calls this once per file. */
export async function uploadOnePhotoAction(cityKey: string, formData: FormData): Promise<ActionResult> {
  await requireAdmin()
  await requireKnownCity(cityKey)
  const file = formData.get('photo')
  const alt = formData.get('alt')
  if (!(file instanceof File) || file.size === 0 || typeof alt !== 'string' || alt.trim() === '') {
    return { ok: false, error: 'choose a photo and write a caption' }
  }
  const result = await addPhotoLogic(cityKey, { bytes: new Uint8Array(await file.arrayBuffer()), name: file.name, type: file.type, alt })
  if (result.ok) revalidateAbout(cityKey)
  return result
}

export async function removePhotoAction(cityKey: string, photoPath: string): Promise<ActionResult> {
  await requireAdmin()
  await requireKnownCity(cityKey)
  const result = await removePhotoLogic(cityKey, photoPath)
  if (result.ok) revalidateAbout(cityKey)
  return result
}

/** Every `alt:<path>` field on the captions form. */
export async function savePhotoCaptionsAction(cityKey: string, formData: FormData): Promise<void> {
  await requireAdmin()
  await requireKnownCity(cityKey)
  const captions: Record<string, string> = {}
  for (const [name, value] of formData.entries()) {
    if (name.startsWith('alt:') && typeof value === 'string') captions[name.slice(4)] = value
  }
  const result = await savePhotoCaptionsLogic(cityKey, captions)
  if (!result.ok) {
    redirect(`${ADMIN_BASE}/sites/${cityKey}?error=${encodeURIComponent(result.error)}`)
  }
  revalidateAbout(cityKey)
}

export async function writeAboutStoryAction(cityKey: string): Promise<ActionResult> {
  await requireAdmin()
  await requireKnownCity(cityKey)
  const result = await writeAboutStoryLogic(cityKey)
  if (result.ok) revalidateAbout(cityKey)
  return result
}

export async function removeAboutStoryAction(cityKey: string): Promise<ActionResult> {
  await requireAdmin()
  await requireKnownCity(cityKey)
  const result = await removeAboutStoryLogic(cityKey)
  if (result.ok) revalidateAbout(cityKey)
  return result
}
