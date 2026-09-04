import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createDraftAction } from '../actions'
import { ADMIN_SITES } from '@/lib/admin-routes'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ErrorText } from '../../ui'
import { requireAdmin } from '@/lib/auth-server'

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
  /*
   * Own guard, in addition to the layout's — creating a city is admin-only
   * per src/lib/access.ts, and a manager must not be able to reach this form
   * through a soft navigation the layout does not re-render for.
   */
  await requireAdmin()

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
                {/* No pattern/length constraint: the field takes "FL" or
                  * "Florida" and deriveFacts() resolves either to the code.
                  * A browser-level pattern would reject the full name before
                  * the server ever saw it. */}
                <Input
                  id="state"
                  name="state"
                  required
                  maxLength={40}
                  className="min-h-11 sm:min-h-9"
                  placeholder="FL"
                />
                <p className="mt-1 text-[0.75rem] text-muted-foreground">
                  Two-letter code or full name. FL or Florida.
                </p>
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

            {/*
              * The ops block. Every field is optional -- a brand-new market
              * has none of it -- but they are shown here rather than hidden
              * behind an "advanced" toggle on purpose: this is the only input
              * a competitor cannot reproduce, and a collapsed section stays
              * empty forever. A page that receives one of these facts is
              * required to use it.
              */}
            <div className="rounded-md border border-border/60 p-4">
              <p className="text-[0.95rem] font-semibold">What we know about this market</p>
              <p className="mt-1 text-[0.8rem] text-muted-foreground">
                All optional, and you can add them later. Pages that carry these outrank pages that
                don&rsquo;t &mdash; a competitor can describe the town, but only you can say who
                cleans there.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="zips" className="mb-1.5">
                    ZIP codes you serve
                  </Label>
                  <Textarea
                    id="zips"
                    name="zips"
                    rows={2}
                    placeholder="77002, 77003, 77004 — commas, spaces or one per line"
                  />
                  <p className="mt-1 text-[0.75rem] text-muted-foreground">
                    Printed as a list on the home page. Anything that isn&rsquo;t five digits is
                    ignored rather than guessed at.
                  </p>
                </div>

                <div>
                  <Label htmlFor="crewLead" className="mb-1.5">
                    Crew lead
                  </Label>
                  <Input
                    id="crewLead"
                    name="crewLead"
                    className="min-h-11 sm:min-h-9"
                    placeholder="First name only — Maria"
                  />
                </div>

                <div>
                  <Label htmlFor="servingSince" className="mb-1.5">
                    Serving since
                  </Label>
                  <Input
                    id="servingSince"
                    name="servingSince"
                    className="min-h-11 sm:min-h-9"
                    placeholder="2024-03"
                  />
                </div>

                <div>
                  <Label htmlFor="crewSize" className="mb-1.5">
                    Crew size
                  </Label>
                  <Input
                    id="crewSize"
                    name="crewSize"
                    inputMode="numeric"
                    className="min-h-11 sm:min-h-9"
                    placeholder="4"
                  />
                </div>

                <div>
                  <Label htmlFor="homesCleaned" className="mb-1.5">
                    Homes cleaned here
                  </Label>
                  <Input
                    id="homesCleaned"
                    name="homesCleaned"
                    inputMode="numeric"
                    className="min-h-11 sm:min-h-9"
                    placeholder="340"
                  />
                  <p className="mt-1 text-[0.75rem] text-muted-foreground">
                    Round down to a number you could defend.
                  </p>
                </div>
              </div>
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
