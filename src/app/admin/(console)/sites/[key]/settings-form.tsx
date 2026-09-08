'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '../../../submit-button'
import { saveNotifyEmailsAction } from '../site-actions'

type SaveState = { savedAt: number } | null

// same saveNotifyEmailsAction as before; a partial save redirects (throws), so no false toast
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
