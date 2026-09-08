'use client' // Error boundaries must be Client Components (Next 16 error.js convention).
// Error boundary for the admin tree so a throw during a mutation lands on a panel, not Next's default screen.
// Shows the digest, not the message. unstable_retry() re-fetches the segment, which is what a transient DB failure needs.
import { RotateCw, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <Alert variant="destructive">
      <TriangleAlert className="size-4" aria-hidden="true" />
      <AlertTitle>That didn&rsquo;t go through.</AlertTitle>
      <AlertDescription className="gap-3">
        <p>
          Something failed while loading or saving this screen — most often the database being
          briefly unreachable. Nothing was lost that had already been saved, but anything you had
          just submitted may not have been. Try again, and check the server logs if it keeps
          happening.
        </p>
        {error.digest && <p className="font-mono text-[0.75rem]">digest: {error.digest}</p>}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => unstable_retry()}
          className="min-h-11 sm:min-h-8"
        >
          <RotateCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  )
}
