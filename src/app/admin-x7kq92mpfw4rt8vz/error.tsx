'use client' // Error boundaries must be Client Components (Next 16 error.js convention).
/*
 * The admin's four READ screens each degrade on their own: a database blip
 * renders a legible "data is unavailable" panel instead of a 500. The three
 * MUTATIONS had no equivalent -- setStatusAction, saveNotesAction and
 * saveNotifyEmailsAction all let any non-P2025 Prisma error bubble straight
 * to Next's default error screen, which is where an operator loses the notes
 * they had just typed.
 *
 * This boundary covers the whole admin route tree, so a throw during a click
 * lands on the same kind of panel the reads already show. It deliberately
 * shows no error text: `error.message` from a Server Component is a generic
 * string plus a digest in production anyway, and the underlying failure is
 * already logged server-side where it is actionable. The digest is surfaced
 * so a report can be matched to that log line.
 *
 * unstable_retry() (not reset()) is the Next 16 recovery call: it re-fetches
 * and re-renders the segment, which is what a transient database failure
 * actually needs. reset() alone would re-render the same stale attempt.
 *
 * <Alert> already sets role="alert" itself (src/components/ui/alert.tsx), so
 * there is no separate wrapper div carrying that role here.
 */
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
