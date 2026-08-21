'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/*
 * The one place `useFormStatus` lives (Stage 2's fix for "clicking a save
 * button gives no feedback until the server re-renders"). Must be rendered
 * INSIDE the <form> it reports on -- useFormStatus reads the nearest
 * ancestor form's pending state, so this cannot be the same component that
 * renders the <form> tag itself. Every real form submit in the converted
 * screens (notes, per-city notification emails) uses this instead of a bare
 * <button type="submit">.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: ReactNode
  pendingLabel?: ReactNode
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className={cn('min-h-11 sm:min-h-9', className)}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  )
}
