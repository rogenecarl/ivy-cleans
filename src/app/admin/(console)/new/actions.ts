'use server'

// Thin server-action wrappers; the substance is in src/server/pipeline/admin-logic/ (testable without Next).
// Every action starts with a guard — the layout guard does not run for an action POST — and every export is admin-only.

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/server/auth/auth-server'
import { addPhotoLogic, createDraftFromFields } from '@/server/pipeline/admin-logic'
import { ADMIN_BASE } from '@/server/auth/admin-routes'
import { checkPhotoUpload } from '@/server/pipeline/photos'

/** FormData values are `string | File`; every field on these forms is a string. */
function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

// errors redirect back to the form with ?error=; the redirects sit OUTSIDE createDraftFromFields' try/catch (redirect throws)
export async function createDraftAction(formData: FormData): Promise<void> {
  await requireAdmin()

  // photos are checked before the draft exists, so a bad file sends the form back instead of a half-made city
  const crewPhotos = formData.getAll('crewPhoto').filter((f): f is File => f instanceof File && f.size > 0)
  for (const [i, file] of crewPhotos.entries()) {
    const problem = checkPhotoUpload({ type: file.type, size: file.size, count: i, alt: 'crew' })
    if (problem) redirect(`${ADMIN_BASE}/new?error=${encodeURIComponent(`${file.name}: ${problem}`)}`)
  }

  const result = await createDraftFromFields({
    city: field(formData, 'city'),
    state: field(formData, 'state'),
    phone: field(formData, 'phone'),
    address: field(formData, 'address'),
    // The ops block. Parsed in createDraftFromFields, which already owns
    // turning form text into facts — this just forwards the raw strings.
    zips: field(formData, 'zips'),
    servingSince: field(formData, 'servingSince'),
    crewLead: field(formData, 'crewLead'),
    crewSize: field(formData, 'crewSize'),
    homesCleaned: field(formData, 'homesCleaned'),
  })

  if (!result.ok) {
    redirect(`${ADMIN_BASE}/new?error=${encodeURIComponent(result.error)}`)
  }

  // the first photo is the crew photo; the rest go to the gallery
  const city = field(formData, 'city').trim()
  const caption = field(formData, 'crewPhotoAlt').trim() || `The ${city} crew`
  for (const [i, file] of crewPhotos.entries()) {
    const alt = i === 0 ? (/\bcrew\b/i.test(caption) ? caption : `${caption} (crew)`) : `${city} crew at work (${i + 1})`
    const stored = await addPhotoLogic(result.key, {
      bytes: new Uint8Array(await file.arrayBuffer()),
      name: file.name,
      type: file.type,
      alt,
    })
    // the city exists either way; a storage failure is logged and the photo can be added in the site's Settings
    if (!stored.ok) console.error(`createDraftAction: photo "${file.name}" for "${result.key}" was not stored: ${stored.error}`)
  }
  redirect(`${ADMIN_BASE}/generate/${result.key}`)
}
