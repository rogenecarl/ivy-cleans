'use server'

/**
 * The admin's server actions — thin wrappers, on purpose.
 *
 * Every function here is a Next RPC endpoint, so this module cannot be
 * imported by vitest without dragging in the framework's server runtime. All
 * of the substance therefore lives in src/pipeline/admin-logic.ts (plain
 * async functions, tested in tests/admin-logic.test.ts) and this file adds
 * only what needs Next: redirect() after a create, and revalidatePath() after
 * anything that changes what a rendered city page would show.
 *
 * revalidatePath('/', 'layout') is deliberately the blunt version: a city's
 * pages are reachable both at the public paths (via the host rewrite) and at
 * the /<cityKey> preview prefix, so there is no single path to invalidate.
 * The admin is used a handful of times a day — a full-tree revalidation costs
 * nothing here and cannot leave a stale published page behind.
 *
 * These actions are as reachable as the pages, whether or not the caller ever
 * loaded the Sites screen -- the Next docs' "treat every action as an
 * untrusted entry point" warning. Two things follow, and BOTH are needed:
 * every input is validated here, and every function starts with a guard from
 * src/lib/auth-server.ts. The (console) layout's guard does NOT cover these
 * -- a layout does not run for an action POST. Every export here is
 * admin-only, including the two read-only ones (listCitiesAction,
 * getProgressAction): they leak which cities exist and how generation is
 * progressing, which is not a manager's business.
 */

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

/**
 * New-city form submit. Errors cannot be returned from an action a <form>
 * posts to directly without turning the page into a client component, so a
 * failure redirects back to the form with the message in the query string and
 * the form re-renders it. Both redirects sit OUTSIDE the try/catch inside
 * createDraftFromFields — redirect() signals by throwing, and swallowing that
 * throw would silently do nothing.
 */
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

/**
 * Which areas the suburb stage still owes, so the client can drive that loop
 * one request per area. See pendingSuburbsLogic for why the loop is not
 * server-side.
 */
export async function pendingSuburbsAction(key: string) {
  await requireAdmin()
  return pendingSuburbsLogic(key)
}

/**
 * Which service pages the service stage still owes, so the client can drive
 * that loop one request per service. See pendingServicesLogic for why the
 * loop is not server-side.
 */
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

/**
 * Publish, and optionally BUY a domain on the way.
 *
 * `provision` spends real money, so it crosses the boundary as an explicit
 * flag rather than a default — the publish screen's toggle is off unless the
 * operator turns it on for that city.
 */
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
