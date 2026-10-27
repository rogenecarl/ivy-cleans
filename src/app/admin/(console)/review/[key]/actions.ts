'use server'

// Thin server-action wrappers; the substance is in src/server/pipeline/admin-logic/ (testable without Next).
// Every action starts with a guard — the layout guard does not run for an action POST — and every export is admin-only.
// revalidatePath('/', 'layout') on purpose: a city is reachable at public paths and the /<key> preview.

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/server/auth/auth-server'
import {
  checkProvisioningLogic,
  isStageId,
  publishLogic,
  regenerateLogic,
  updateSuburbsLogic,
  type ActionResult,
  type SuburbRow,
} from '@/server/pipeline/admin-logic'

export async function regenerateAction(key: string, stage: string): Promise<ActionResult> {
  await requireAdmin()
  if (!isStageId(stage)) return { ok: false, error: `unknown stage "${stage}"` }
  const result = await regenerateLogic(key, stage)
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
