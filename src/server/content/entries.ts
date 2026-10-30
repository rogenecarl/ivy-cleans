// Where city documents, drafts, progress logs and the two indexes are kept. Vercel's filesystem is read-only, so there
// they are rows in Postgres layered over the committed content/ files; locally and in tests they are those files.
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises'
import path from 'path'

export type EntryKind = 'city' | 'draft' | 'progress' | 'index'

export const CONTENT_DIR = path.join(process.cwd(), 'content')
export const DRAFTS_DIR = path.join(CONTENT_DIR, '_drafts')

export function usesDatabase(): boolean {
  const store = process.env.CONTENT_STORE
  return store === 'db' || (process.env.VERCEL === '1' && store !== 'file')
}

function filePath(kind: EntryKind, key: string): string {
  if (kind === 'city') return path.join(CONTENT_DIR, `${key}.json`)
  if (kind === 'draft') return path.join(DRAFTS_DIR, `${key}.json`)
  if (kind === 'progress') return path.join(DRAFTS_DIR, `${key}.progress.json`)
  return path.join(CONTENT_DIR, `_${key}.json`)
}

/** The committed file, or null when there is none. Public reads fall back to this when the database is down. */
export async function readFileEntry(kind: EntryKind, key: string): Promise<unknown | null> {
  let raw: string
  try {
    raw = await readFile(filePath(kind, key), 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
  return JSON.parse(raw)
}

/** The entry, or null when there is none. A database failure throws: it is not "nothing there". */
export async function readEntry(kind: EntryKind, key: string): Promise<unknown | null> {
  if (!usesDatabase()) return readFileEntry(kind, key)
  const { readRow } = await import('./db-store')
  const row = await readRow(kind, key)
  if (row === null) return readFileEntry(kind, key)
  return row.deleted ? null : row.data
}

export async function writeEntry(kind: EntryKind, key: string, data: unknown): Promise<void> {
  if (usesDatabase()) {
    const { writeRow } = await import('./db-store')
    await writeRow(kind, key, data)
    return
  }
  const file = filePath(kind, key)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(data, null, 2), 'utf-8')
}

export async function deleteEntry(kind: EntryKind, key: string): Promise<void> {
  if (usesDatabase()) {
    const { deleteRow } = await import('./db-store')
    await deleteRow(kind, key)
    return
  }
  await rm(filePath(kind, key), { force: true })
}

/** Keys of the committed city or draft files. */
export async function listFileKeys(kind: 'city' | 'draft'): Promise<string[]> {
  let entries
  try {
    // withFileTypes: content/_drafts/ must never look like a city document
    entries = await readdir(kind === 'city' ? CONTENT_DIR : DRAFTS_DIR, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.json') && !e.name.startsWith('_') && !e.name.endsWith('.progress.json'))
    .map((e) => e.name.slice(0, -'.json'.length))
}

export async function listEntryKeys(kind: 'city' | 'draft'): Promise<string[]> {
  const files = await listFileKeys(kind)
  if (!usesDatabase()) return files
  const { listRows } = await import('./db-store')
  const rows = await listRows(kind)
  const deleted = new Set(rows.filter((r) => r.deleted).map((r) => r.key))
  const keys = new Set([...files, ...rows.filter((r) => !r.deleted).map((r) => r.key)])
  return [...keys].filter((key) => !deleted.has(key))
}
