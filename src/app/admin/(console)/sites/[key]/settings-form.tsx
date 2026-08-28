'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '../../../submit-button'
import { saveNotifyEmailsAction } from '../site-actions'

type SaveState = { savedAt: number } | null

/*
 * Wraps the exact same saveNotifyEmailsAction(cityKey, formData) the old
 * plain <form> called. On the happy path it returns and this toasts; on the
 * "some entries were rejected" path the action calls next/navigation's
 * redirect(), which throws through this wrapper same as it always did and
 * never reaches the `return` below -- so no false-positive toast fires when
 * the save was actually partial. The page re-renders at ?error=... instead,
 * same as before this stage.
 */
export function SettingsForm({ cityKey, defaultValue }: { cityKey: string; defaultValue: string }) {
  const [state, formAction] = useActionState<SaveState, FormData>(async (_prev, formData) => {
    await saveNotifyEmailsAction(cityKey, formData)
    return { savedAt: Date.now() }
  }, null)
  const savedAt = useRef<number | null>(null)

  useEffect(() => {
    if (state && state.savedAt !== savedAt.current) {
      savedAt.current = state.savedAt
      toast.success('Notification inboxes saved')
    }
  }, [state])

  return (
    <form action={formAction} className="space-y-3">
      <Textarea
        id="emails"
        name="emails"
        rows={4}
        defaultValue={defaultValue}
        placeholder="miami@example.com"
        aria-label="Notification inboxes, one address per line"
      />
      <SubmitButton pendingLabel="Saving">Save</SubmitButton>
    </form>
  )
}
