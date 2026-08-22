import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createDraftAction } from '../actions'
import { ADMIN_SITES } from '../base'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ErrorText } from '../ui'

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
        <Link
          href={ADMIN_SITES}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-sm text-[0.85rem] text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Sites
        </Link>
        <h1 className="mt-2 text-[1.4rem] font-semibold tracking-tight">Create site</h1>
        <p className="mt-1 text-[0.85rem] text-muted-foreground">
          The phone number and state name are derived in code and never written by the AI.
        </p>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      <Card className="mt-4">
        <CardContent>
          <form action={createDraftAction} className="space-y-4">
            <div>
              <Label htmlFor="city" className="mb-1.5">
                City <span className="text-destructive">*</span>
              </Label>
              <Input id="city" name="city" required className="min-h-11 sm:min-h-9" placeholder="Miami" />
              <p className="mt-1 text-[0.75rem] text-muted-foreground">
                Becomes the site’s city name and its URL key (Miami → /miami).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="state" className="mb-1.5">
                  State <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="state"
                  name="state"
                  required
                  maxLength={2}
                  minLength={2}
                  pattern="[A-Za-z]{2}"
                  className="min-h-11 sm:min-h-9"
                  placeholder="FL"
                />
                <p className="mt-1 text-[0.75rem] text-muted-foreground">Two-letter code.</p>
              </div>
              <div>
                <Label htmlFor="phone" className="mb-1.5">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  required
                  className="min-h-11 sm:min-h-9"
                  placeholder="(305) 555-0142"
                />
                <p className="mt-1 text-[0.75rem] text-muted-foreground">
                  Any format works. Punctuation is stripped to ten digits.
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="address" className="mb-1.5">
                Address
              </Label>
              <Input
                id="address"
                name="address"
                className="min-h-11 sm:min-h-9"
                placeholder="Optional. Shown on the contact page"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="mb-1.5">
                Notes
              </Label>
              {/* Placeholder only, by request -- no help text under this field.
                * Worth knowing if you are changing it: the hard limits in
                * src/pipeline/stages.ts strip prices, numbers, awards and
                * guarantees from the generated copy no matter what is typed
                * here (stages.ts:194 wraps these notes with an instruction that
                * they cannot authorize anything those limits forbid). That is
                * no longer stated in the UI, so an operator will not know it. */}
              <Textarea
                id="notes"
                name="notes"
                rows={5}
                placeholder="Additional Context for AI when generating a site"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="lg" className="min-h-11 sm:min-h-9">
                Create &amp; generate
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-11 sm:min-h-9">
                <Link href={ADMIN_SITES}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
