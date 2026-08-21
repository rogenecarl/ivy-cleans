import Link from 'next/link'
import { createDraftAction } from '../actions'
import { ADMIN_BASE } from '../base'
import { BTN, BTN_PRIMARY, ErrorText, INPUT, LABEL } from '../ui'

/*
 * New-city form. A plain server-rendered <form action={serverAction}> — no
 * client component, so it works before hydration and there is no submit-state
 * machinery to get wrong.
 *
 * Errors arrive back as ?error=… : createDraftAction redirects here with the
 * message when deriveFacts rejects the phone/state or a draft already exists.
 * (Next 16: searchParams is a Promise and must be awaited.)
 */
export const dynamic = 'force-dynamic'

export default async function NewCityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <>
      <div className="mb-6">
        <Link href={ADMIN_BASE} className="text-[0.85rem] text-[#6b7680] hover:underline">
          ← Cities
        </Link>
        <h1 className="mt-2 text-[1.4rem] font-semibold tracking-tight">New city</h1>
        <p className="mt-1 text-[0.85rem] text-[#6b7680]">
          The phone number and state name are derived in code and never written by the AI.
        </p>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      <form action={createDraftAction} className="mt-4 rounded-lg border border-[#d8dde2] bg-white p-5">
        <div className="mb-4">
          <label className={LABEL} htmlFor="city">
            City <span className="text-[#a11212]">*</span>
          </label>
          <input id="city" name="city" required className={INPUT} placeholder="Miami" />
          <p className="mt-1 text-[0.75rem] text-[#6b7680]">
            Becomes the site’s city name and its URL key (Miami → /miami).
          </p>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="state">
              State <span className="text-[#a11212]">*</span>
            </label>
            <input
              id="state"
              name="state"
              required
              maxLength={2}
              minLength={2}
              pattern="[A-Za-z]{2}"
              className={INPUT}
              placeholder="FL"
            />
            <p className="mt-1 text-[0.75rem] text-[#6b7680]">Two-letter code.</p>
          </div>
          <div>
            <label className={LABEL} htmlFor="phone">
              Phone <span className="text-[#a11212]">*</span>
            </label>
            <input id="phone" name="phone" required className={INPUT} placeholder="(305) 555-0142" />
            <p className="mt-1 text-[0.75rem] text-[#6b7680]">
              Any format works. Punctuation is stripped to ten digits.
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className={LABEL} htmlFor="address">
            Address
          </label>
          <input
            id="address"
            name="address"
            className={INPUT}
            placeholder="Optional. Shown on the contact page"
          />
        </div>

        <div className="mb-5">
          <label className={LABEL} htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={5}
            className={INPUT}
            placeholder="Additional context for the AI"
          />
          <p className="mt-1 text-[0.75rem] text-[#6b7680]">
            Additional context for the AI. This is the only field it reads, and it shapes both the
            research and the copy: mention the local climate, the housing mix, and the jobs this
            branch does most. It never overrides the rules: no prices, numbers, awards or guarantees
            reach the copy, whatever is written here.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className={BTN_PRIMARY}>
            Create &amp; generate
          </button>
          <Link href={ADMIN_BASE} className={BTN}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  )
}
