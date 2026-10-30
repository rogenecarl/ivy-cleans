// src/server/pipeline/progress.ts
// Per-draft progress log (a `progress` entry), capped at PROGRESS_CAP. Framework-free.
// Appends for one key are serialised through a per-key promise chain.
import { deleteEntry, readEntry, writeEntry } from '@/server/content/entries'

export type ProgressKind = 'start' | 'search' | 'reading' | 'found' | 'done' | 'error'

export type ProgressEvent = {
  /** ISO timestamp, new Date().toISOString() at append time. */
  at: string
  /** StageId, typed as string here to keep this module dependency-free. */
  stage: string
  kind: ProgressKind
  label: string
}

export const PROGRESS_CAP = 500

const KEY_PATTERN = /^[a-z0-9-]+$/

const chains = new Map<string, Promise<void>>()

function assertKeyShape(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`invalid progress key "${key}": must match ${KEY_PATTERN}`)
  }
}

/** Runs `fn` after chaining onto any in-flight work for `key`, so writes for a given key never interleave. */
function enqueue(key: string, fn: () => Promise<void>): Promise<void> {
  const previous = chains.get(key) ?? Promise.resolve()
  const next = previous.then(fn, fn)
  chains.set(key, next)
  next
    .finally(() => {
      if (chains.get(key) === next) chains.delete(key)
    })
    .catch(() => {})
  return next
}

export async function readProgress(key: string): Promise<ProgressEvent[]> {
  assertKeyShape(key)
  try {
    const parsed = await readEntry('progress', key)
    return Array.isArray(parsed) ? (parsed as ProgressEvent[]) : []
  } catch {
    return []
  }
}

export async function appendProgress(key: string, event: Omit<ProgressEvent, 'at'>): Promise<void> {
  assertKeyShape(key)
  await enqueue(key, async () => {
    const existing = await readProgress(key)
    const updated = [...existing, { ...event, at: new Date().toISOString() }].slice(-PROGRESS_CAP)
    try {
      await writeEntry('progress', key, updated)
    } catch (err) {
      // an activity line is not worth failing a stage the model has already been paid for
      console.error(`progress: append for "${key}" failed:`, err)
    }
  })
}

export async function clearProgress(key: string, stage?: string): Promise<void> {
  assertKeyShape(key)
  await enqueue(key, async () => {
    if (stage === undefined) {
      await deleteEntry('progress', key)
      return
    }
    const existing = await readProgress(key)
    const kept = existing.filter((e) => e.stage !== stage)
    await writeEntry('progress', key, kept)
  })
}
