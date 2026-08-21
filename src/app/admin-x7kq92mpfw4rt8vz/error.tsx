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
 */
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-[#f3b4b4] bg-[#fdecec] px-4 py-6 text-[0.9rem] text-[#7a1414]"
    >
      <p className="font-semibold">That didn&rsquo;t go through.</p>
      <p className="mt-1 text-[0.85rem]">
        Something failed while loading or saving this screen — most often the database being
        briefly unreachable. Nothing was lost that had already been saved, but anything you had
        just submitted may not have been. Try again, and check the server logs if it keeps
        happening.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[0.75rem] text-[#8a5300]">digest: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-4 inline-flex items-center rounded-md border border-[#c3cbd3] bg-white px-3 py-1.5 text-[0.85rem] font-medium text-[#1b1f23] hover:bg-[#eef1f4]"
      >
        Try again
      </button>
    </div>
  )
}
