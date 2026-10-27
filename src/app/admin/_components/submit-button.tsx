'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// the one place useFormStatus lives; must render INSIDE the <form> it reports on
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
