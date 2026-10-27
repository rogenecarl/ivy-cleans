'use server'

// Thin server-action wrappers; the substance is in src/server/pipeline/admin-logic/ (testable without Next).
// Every action starts with a guard — the layout guard does not run for an action POST — and every export is admin-only.
// revalidatePath('/', 'layout') on purpose: a city is reachable at public paths and the /<key> preview.

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/server/auth/auth-server'
import {
  finalizeLogic,
  getProgressLogic,
  isStageId,
  pendingServicesLogic,
  pendingSuburbsLogic,
  runStageLogic,
  type ActionResult,
  type ProgressSnapshot,
} from '@/server/pipeline/admin-logic'

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

export async function finalizeAction(key: string): Promise<ActionResult> {
  await requireAdmin()
  const result = await finalizeLogic(key)
  // A finalize writes content/<key>.json for the first time — the preview
  // link on the review screen is only correct once the tree is revalidated.
  if (result.ok) revalidatePath('/', 'layout')
  return result
}

/** Read-only poll for the live activity feed — no revalidatePath, nothing changed. */
export async function getProgressAction(key: string): Promise<ProgressSnapshot> {
  await requireAdmin()
  return getProgressLogic(key)
}
