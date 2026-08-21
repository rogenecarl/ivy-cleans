// src/pipeline/progress.ts
/*
 * Per-draft progress log for the admin pipeline's live activity feed. Each
 * in-flight (or finished) draft key gets a sidecar at
 * content/_drafts/<key>.progress.json — a JSON array of ProgressEvent,
 * capped at PROGRESS_CAP entries — that stage runners append to as they
 * work (search queries, pages read, sections written, errors) so the admin
 * UI can poll/stream it back to the operator.
 *
 * Framework-free by design: node:fs/promises + node:path only, no next/*
 * import. Concurrent appends for the SAME key are serialized through a
 * module-level per-key promise chain so overlapping stream callbacks can't
 * race a read-modify-write cycle and silently drop events.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

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

const DRAFTS_DIR = path.join(process.cwd(), 'content', '_drafts')
const KEY_PATTERN = /^[a-z0-9-]+$/

const chains = new Map<string, Promise<void>>()

function assertKeyShape(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`invalid progress key "${key}": must match ${KEY_PATTERN}`)
  }
}

function progressPath(key: string): string {
  return path.join(DRAFTS_DIR, `${key}.progress.json`)
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
    const raw = await readFile(progressPath(key), 'utf-8')
    const parsed = JSON.parse(raw)
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
    await mkdir(DRAFTS_DIR, { recursive: true })
    await writeFile(progressPath(key), JSON.stringify(updated), 'utf-8')
  })
}

export async function clearProgress(key: string, stage?: string): Promise<void> {
  assertKeyShape(key)
  await enqueue(key, async () => {
    if (stage === undefined) {
      await rm(progressPath(key), { force: true })
      return
    }
    const existing = await readProgress(key)
    const kept = existing.filter((e) => e.stage !== stage)
    await mkdir(DRAFTS_DIR, { recursive: true })
    await writeFile(progressPath(key), JSON.stringify(kept), 'utf-8')
  })
}
