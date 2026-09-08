'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LEAD_STATUSES, type LeadStatus } from '@/leads/types'
import { setStatusAction } from '../lead-actions'

// one Select instead of five forms; still calls setStatusAction(id, status). No <form>, so the action runs inside
// useTransition for `isPending` (the sanctioned non-form pattern per the Next server-actions guide).
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
        // revert the optimistic pick only on a genuine failure; LeadNotFoundError resolves and notFound() takes over on re-render
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
