'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '../../submit-button'
import { saveNotesAction } from '../lead-actions'

type SaveState = { savedAt: number } | null

/*
 * Wraps the exact same saveNotesAction(id, formData) the old plain <form>
 * called -- useActionState just gives this a return value to key a toast off
 * of. `savedAt` (not a boolean) so a second identical save still produces a
 * new value and the effect fires again; a plain `true` would look unchanged
 * to React between two successful saves.
 */
export function NotesForm({ id, notes }: { id: string; notes: string }) {
  const [state, formAction] = useActionState<SaveState, FormData>(async (_prev, formData) => {
    await saveNotesAction(id, formData)
    return { savedAt: Date.now() }
  }, null)
  const savedAt = useRef<number | null>(null)

  useEffect(() => {
    if (state && state.savedAt !== savedAt.current) {
      savedAt.current = state.savedAt
      toast.success('Notes saved')
    }
  }, [state])

  return (
    <form action={formAction} className="space-y-3">
      <Textarea
        name="notes"
        rows={4}
        defaultValue={notes}
        placeholder="What happened on the call"
        aria-label="Notes"
      />
      <SubmitButton pendingLabel="Saving">Save notes</SubmitButton>
    </form>
  )
}
