'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/app/admin/_components/submit-button'
import { saveContactAction } from '@/app/admin/(console)/sites/actions'

type SaveState = { savedAt: number } | null

// Phone and street address, editable on a draft or a live city. Same wrapper shape as FactsForm: a refused value
// redirects with the error, so no false toast.
export function ContactForm({ cityKey, phone, address }: { cityKey: string; phone: string; address: string }) {
  const [state, formAction] = useActionState<SaveState, FormData>(async (_prev, formData) => {
    await saveContactAction(cityKey, formData)
    return { savedAt: Date.now() }
  }, null)
  const savedAt = useRef<number | null>(null)

  useEffect(() => {
    if (state && state.savedAt !== savedAt.current) {
      savedAt.current = state.savedAt
      toast.success('Phone and address saved')
    }
  }, [state])

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
        <div>
          <Label htmlFor="phone" className="mb-1.5">
            Phone
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            className="min-h-11 sm:min-h-9"
            defaultValue={phone}
            placeholder="(612) 555-0142"
          />
        </div>

        <div>
          <Label htmlFor="address" className="mb-1.5">
            Street address
          </Label>
          <Input
            id="address"
            name="address"
            className="min-h-11 sm:min-h-9"
            defaultValue={address}
            placeholder="4412 Girard Ave S, Minneapolis, MN 55409"
          />
        </div>
      </div>
      <p className="text-[0.75rem] text-muted-foreground">
        Printed on every page and in the booking flow. A city needs a real address before it can be published.
      </p>

      <SubmitButton pendingLabel="Saving">Save phone and address</SubmitButton>
    </form>
  )
}
