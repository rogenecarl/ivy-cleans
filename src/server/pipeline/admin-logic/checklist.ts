// "Before it can go live": every check publish makes, shown before the button rather than after it fails.
import { ADMIN_BASE } from '@/server/auth/admin-routes'
import { realAddress } from '@/server/content/interpolate'
import type { CityContent } from '@/server/content/types'

export type CheckItem = {
  id: 'phone' | 'address' | 'facts' | 'duplication' | 'quality' | 'inbox' | 'about'
  state: 'ok' | 'fail' | 'todo'
  required: boolean
  label: string
  detail: string
  action?: { label: string; href: string }
}

export function publishChecklist(input: {
  key: string
  doc: CityContent
  undecided: number
  /** null = the check could not run (a live city would not load) */
  duplicationFindings: number | null
  invisibleChars: number
  blockingQuality: number
  /** null = the leads store could not be reached */
  inboxCount: number | null
  aboutMissing: readonly string[]
}): { items: CheckItem[]; canPublish: boolean } {
  const settings = `${ADMIN_BASE}/sites/${input.key}`
  const address = realAddress(input.doc.address)
  const dupes = input.duplicationFindings
  const items: CheckItem[] = [
    { id: 'phone', state: input.doc.phone ? 'ok' : 'fail', required: true, label: 'Phone', detail: input.doc.phoneDisplay, action: input.doc.phone ? undefined : { label: 'Add', href: settings } },
    address
      ? { id: 'address', state: 'ok', required: true, label: 'Street address', detail: address }
      : { id: 'address', state: 'fail', required: true, label: 'Street address', detail: 'printed on the contact page', action: { label: 'Add', href: settings } },
    input.undecided === 0
      ? { id: 'facts', state: 'ok', required: true, label: 'Research facts', detail: 'every fact checked or decided' }
      : {
          id: 'facts',
          state: 'fail',
          required: true,
          label: `${input.undecided} ${input.undecided === 1 ? 'fact' : 'facts'} undecided`,
          detail: 'keep or drop each one',
          action: { label: 'Decide', href: `${ADMIN_BASE}/generate/${input.key}` },
        },
    dupes === null
      ? { id: 'duplication', state: 'todo', required: true, label: 'Copy not repeated from other cities', detail: 'could not be checked — a live city would not load' }
      : dupes + input.invisibleChars === 0
        ? { id: 'duplication', state: 'ok', required: true, label: 'No copy repeated from other cities', detail: 'checked against every live city' }
        : {
            id: 'duplication',
            state: 'fail',
            required: true,
            label: 'Copy repeated from another city',
            detail: [dupes && `${dupes} passages`, input.invisibleChars && `${input.invisibleChars} invisible characters`].filter(Boolean).join(' · '),
          },
    input.blockingQuality === 0
      ? { id: 'quality', state: 'ok', required: true, label: 'Quality checks', detail: 'no banned phrases, real places used' }
      : { id: 'quality', state: 'fail', required: true, label: `${input.blockingQuality} quality problems`, detail: 'listed below' },
    input.inboxCount === null
      ? { id: 'inbox', state: 'todo', required: false, label: 'Lead inbox', detail: 'recommended · could not be checked' }
      : input.inboxCount > 0
        ? { id: 'inbox', state: 'ok', required: false, label: 'Lead inbox', detail: `${input.inboxCount} ${input.inboxCount === 1 ? 'address' : 'addresses'}` }
        : { id: 'inbox', state: 'todo', required: false, label: 'Lead inbox', detail: 'recommended · leads are emailed to nobody', action: { label: 'Add', href: settings } },
    input.aboutMissing.length === 0
      ? { id: 'about', state: 'ok', required: false, label: 'About Us page', detail: 'on' }
      : { id: 'about', state: 'todo', required: false, label: 'About Us page', detail: `optional · needs ${input.aboutMissing.join(' and ')}`, action: { label: 'Set up', href: `${settings}#about` } },
  ]
  return { items, canPublish: items.every((i) => !i.required || i.state === 'ok') }
}
