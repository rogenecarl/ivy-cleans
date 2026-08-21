'use server'
/*
 * Mutations for the lead detail screen.
 *
 * Both revalidate the detail page AND the list, because a status change alters
 * the list's filtering and its "still need action" count. Per the Next 16
 * server-actions guide (node_modules/next/dist/docs/01-app/02-guides/server-actions.md),
 * revalidatePath re-renders inside the same response, so the screen updates
 * without a follow-up fetch.
 *
 * NOTE: there is no auth on this admin, by explicit decision of the repo
 * owner. These actions are as reachable as the pages, whether or not the
 * caller ever loaded the detail screen -- the same "treat every action as an
 * untrusted entry point" warning the Next docs give. Every input is validated
 * here so a malformed or hostile POST cannot write junk. When auth is added,
 * the check belongs at the very top of each function below, before any other
 * work -- each one is marked with an "AUTH GOES HERE" comment.
 */
import { revalidatePath } from 'next/cache'
import { LeadNotFoundError, setLeadNotes, setLeadStatus } from '@/leads/store'
import { LEAD_STATUSES, type LeadStatus } from '@/leads/types'
import { ADMIN_BASE } from '../base'

/** Notes are operator free text, not a customer-controlled field, but they still arrive over an unauthenticated POST -- bound so one malicious request cannot grow a row without limit. */
const MAX_NOTES_LENGTH = 5000

/*
 * Both actions below can be POSTed with an id for a lead that does not (or
 * no longer does) exist -- these are unauthenticated endpoints reachable by
 * anyone who can POST, so a wrong or stale id is not exotic. Prisma's
 * .update() throws PrismaClientKnownRequestError P2025 for that, which
 * store.ts translates into LeadNotFoundError so this file never has to
 * import Prisma itself (store.ts is the only module that does).
 *
 * A missing row is not a server fault, so it is not left to bubble into an
 * uncaught 500: it is swallowed here, and the revalidatePath calls that
 * follow still run, forcing the current route to re-render. On that
 * re-render the page's own `getLead` returns null and its existing
 * `if (!lead) notFound()` fires, which is the same "this lead is gone"
 * outcome the operator would see from a plain GET on a bad id -- no new UI
 * needed. Any OTHER error is a genuine server fault and is left to throw.
 */
export async function setStatusAction(id: string, status: LeadStatus): Promise<void> {
  // AUTH GOES HERE, before anything below reads or writes.
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
  // AUTH GOES HERE, before anything below reads or writes.
  const raw = formData.get('notes')
  // A present-but-empty field is a legitimate "clear the notes" action; a
  // field that is absent entirely (or the wrong FormData type, e.g. a File)
  // is a malformed request and must not be silently treated as one.
  if (typeof raw !== 'string') {
    throw new Error('missing or invalid "notes" field')
  }
  const notes = raw.slice(0, MAX_NOTES_LENGTH)
  try {
    await setLeadNotes(id, notes)
  } catch (err) {
    if (!(err instanceof LeadNotFoundError)) throw err
  }
  // Notes are not shown on the list screen, so only the detail page needs to
  // re-render. (Contrast setStatusAction above, which changes what the list
  // itself displays and must revalidate both.)
  revalidatePath(`${ADMIN_BASE}/leads/${id}`)
}
