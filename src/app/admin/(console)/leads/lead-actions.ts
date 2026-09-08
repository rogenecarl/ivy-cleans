'use server'
// Mutations for the lead detail screen. Both revalidate the detail page and the list. Every input is validated and
// every action starts with a guard — the layout guard does not run for an action POST.
import { revalidatePath } from 'next/cache'
import { LeadNotFoundError, setLeadNotes, setLeadStatus } from '@/leads/store'
import { LEAD_STATUSES, type LeadStatus } from '@/leads/types'
import { ADMIN_BASE } from '@/lib/admin-routes'
import { requireSession } from '@/lib/auth-server'

/** Notes are operator free text, not a customer-controlled field, but they still arrive over a POST that any signed-in caller can hit directly -- an authenticated bound is not the same thing as a trusted body, so the length is still capped here to stop one malicious request from growing a row without limit. */
const MAX_NOTES_LENGTH = 5000

// a missing row (Prisma P2025 -> LeadNotFoundError from store.ts) is swallowed: revalidatePath re-renders, the page's
// own getLead returns null and notFound() fires. Any other error is a real fault and throws.
export async function setStatusAction(id: string, status: LeadStatus): Promise<void> {
  await requireSession()
  if (!LEAD_STATUSES.includes(status)) {
    throw new Error(`unknown status "${status}"`)
  }
  try {
    await setLeadStatus(id, status)
  } catch (err) {
    if (!(err instanceof LeadNotFoundError)) throw err
  }
  revalidatePath(`${ADMIN_BASE}/leads/${id}`)
  revalidatePath(`${ADMIN_BASE}/leads`)
}

export async function saveNotesAction(id: string, formData: FormData): Promise<void> {
  await requireSession()
  const raw = formData.get('notes')
  // present-but-empty clears the notes; absent or non-string is a malformed request
  if (typeof raw !== 'string') {
    throw new Error('missing or invalid "notes" field')
  }
  const notes = raw.slice(0, MAX_NOTES_LENGTH)
  try {
    await setLeadNotes(id, notes)
  } catch (err) {
    if (!(err instanceof LeadNotFoundError)) throw err
  }
  // notes aren't on the list screen, so only the detail page re-renders
  revalidatePath(`${ADMIN_BASE}/leads/${id}`)
}
