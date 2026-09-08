'use server'

// Thin server-action wrappers; the substance is in src/pipeline/admin-logic.ts (testable without Next).
// revalidatePath('/', 'layout') on purpose: a city is reachable at public paths and the /<key> preview.
// Every action starts with a guard — the layout guard does not run for an action POST — and every export is admin-only.

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-server'
import {
  createDraftFromFields,
  finalizeLogic,
  getProgressLogic,
  isStageId,
  listCities,
  publishLogic,
  regenerateLogic,
  checkProvisioningLogic,
  pendingServicesLogic,
  pendingSuburbsLogic,
  runStageLogic,
  updateSuburbsLogic,
  type ActionResult,
  type CityRow,
  type ProgressSnapshot,
  type SuburbRow,
} from '@/pipeline/admin-logic'
import { ADMIN_BASE } from '@/lib/admin-routes'

/** FormData values are `string | File`; every field on these forms is a string. */
function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

// errors redirect back to the form with ?error=; the redirects sit OUTSIDE createDraftFromFields' try/catch (redirect throws)
export async function createDraftAction(formData: FormData): Promise<void> {
  await requireAdmin()
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
  redirect(`${ADMIN_BASE}/generate/${result.key}`)
}

export async function runStageAction(
  key: string,
  stage: string,
  only?: string
): Promise<ActionResult> {
  await requireAdmin()
  if (!isStageId(stage)) return { ok: false, error: `unknown stage "${stage}"` }
  return runStageLogic(key, stage, only)
}

// areas the suburb stage still owes; the client drives the loop one request per area
export async function pendingSuburbsAction(key: string) {
  await requireAdmin()
  return pendingSuburbsLogic(key)
}

// service pages the service stage still owes; same one-per-request loop
export async function pendingServicesAction(key: string) {
  await requireAdmin()
  return pendingServicesLogic(key)
}

export async function regenerateAction(key: string, stage: string): Promise<ActionResult> {
  await requireAdmin()
  if (!isStageId(stage)) return { ok: false, error: `unknown stage "${stage}"` }
  const result = await regenerateLogic(key, stage)
  if (result.ok) revalidatePath('/', 'layout')
  return result
}

export async function finalizeAction(key: string): Promise<ActionResult> {
  await requireAdmin()
  const result = await finalizeLogic(key)
  // A finalize writes content/<key>.json for the first time — the preview
  // link on the review screen is only correct once the tree is revalidated.
  if (result.ok) revalidatePath('/', 'layout')
  return result
}

export async function updateSuburbsAction(key: string, suburbs: SuburbRow[]): Promise<ActionResult> {
  await requireAdmin()
  const result = await updateSuburbsLogic(key, suburbs)
  if (result.ok) revalidatePath('/', 'layout')
  return result
}

// publish, optionally buying a domain; `provision` is an explicit flag because it spends money
export async function publishAction(
  key: string,
  domain?: string,
  provision?: boolean,
): Promise<ActionResult> {
  await requireAdmin()
  return publishLogic(key, domain, provision)
}

/** Poll a provisioned domain until DNS and TLS answer. See checkProvisioningLogic. */
export async function checkProvisioningAction(key: string) {
  await requireAdmin()
  return checkProvisioningLogic(key)
}


export async function listCitiesAction(): Promise<CityRow[]> {
  await requireAdmin()
  return listCities()
}

/** Read-only poll for the live activity feed — no revalidatePath, nothing changed. */
export async function getProgressAction(key: string): Promise<ProgressSnapshot> {
  await requireAdmin()
  return getProgressLogic(key)
}
