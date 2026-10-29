// Where each city is and the one thing it needs next — the Dashboard and Sites read this, nothing else decides it.
import { ADMIN_BASE } from '@/server/auth/admin-routes'
import type { CityRow } from './shared'

export type SiteStage = 'generating' | 'stopped' | 'needs-review' | 'ready' | 'live'

export type StageView = { stage: SiteStage; reason: string | null; next: { label: string; href: string } }

export function siteStage(input: {
  row: CityRow
  /** kind of the newest progress event, null when there is none */
  lastEventKind: string | null
  hasAddress: boolean
  undecided: number
  blockingQuality: number
}): StageView {
  const { row } = input
  const generate = `${ADMIN_BASE}/generate/${row.key}`
  const review = `${ADMIN_BASE}/review/${row.key}`
  const settings = `${ADMIN_BASE}/sites/${row.key}`

  if (row.status === 'live') return { stage: 'live', reason: null, next: { label: 'Settings', href: settings } }
  if (row.status === 'error') return { stage: 'needs-review', reason: row.error ?? 'the city file will not load', next: { label: 'Review', href: review } }
  if (row.status === 'generating' || row.status === 'draft-unfinalized') {
    return input.lastEventKind === 'error'
      ? { stage: 'stopped', reason: 'The last step failed — progress is kept', next: { label: 'Resume', href: generate } }
      : { stage: 'generating', reason: null, next: { label: 'Watch progress', href: generate } }
  }
  if (input.undecided > 0) {
    const n = input.undecided
    return { stage: 'needs-review', reason: `${n} ${n === 1 ? 'fact' : 'facts'} to decide`, next: { label: 'Decide', href: generate } }
  }
  if (!input.hasAddress) return { stage: 'needs-review', reason: 'No street address', next: { label: 'Add address', href: settings } }
  if (input.blockingQuality > 0) {
    return { stage: 'needs-review', reason: `${input.blockingQuality} quality problems`, next: { label: 'Review', href: review } }
  }
  return { stage: 'ready', reason: null, next: { label: 'Publish', href: review } }
}
