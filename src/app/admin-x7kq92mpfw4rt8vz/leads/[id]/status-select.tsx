'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LEAD_STATUSES, type LeadStatus } from '@/leads/types'
import { setStatusAction } from '../lead-actions'

/*
 * Stage 2: the five separate <form>-per-status buttons collapse into one
 * Select -- one decision, one control -- but it still calls the exact same
 * setStatusAction(id, status) the buttons called, so lead-actions.ts and the
 * store call underneath it are untouched.
 *
 * A Select's onValueChange is not a form submission, so there is no <form>
 * for useFormStatus to read (see submit-button.tsx for the case where there
 * is one). Per the Next.js Server Actions guide
 * (node_modules/next/dist/docs/01-app/02-guides/server-actions.md,
 * "you create one ... then invoke it from a form, or from an event handler
 * ... wrapped in startTransition"), calling the action directly from the
 * change handler inside useTransition is the sanctioned pattern for a
 * non-form trigger, and it's what gives us `isPending` for the same
 * disable-and-show feedback used everywhere else this stage.
 */
export function StatusSelect({ id, status }: { id: string; status: LeadStatus }) {
  const [value, setValue] = useState<LeadStatus>(status)
  const [isPending, startTransition] = useTransition()

  function handleChange(next: string) {
    const nextStatus = next as LeadStatus
    const previous = value
    setValue(nextStatus)
    startTransition(async () => {
      try {
        await setStatusAction(id, nextStatus)
      } catch {
        // Revert the optimistic pick if the write genuinely failed (not the
        // swallowed LeadNotFoundError case -- that one still resolves, and
        // the page's own notFound() takes over on the next render).
        setValue(previous)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger aria-label="Lead status" className="min-h-11 w-40 capitalize sm:min-h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && (
        <span className="flex items-center gap-1.5 text-[0.8rem] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Saving
        </span>
      )}
    </div>
  )
}
