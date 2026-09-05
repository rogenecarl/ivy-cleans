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

            {/*
              * Owner knowledge and operating facts, collapsed.
              *
              * These WERE shown open, on the reasoning that a collapsed
              * section stays empty forever. That argument no longer holds:
              * every one of these is now editable afterwards at
              * /admin/sites/<key>, which is their natural home, because they
              * describe a market that is already running and this screen
              * creates one that is not. Six always-empty boxes above the
              * button were crowding out the three fields that actually have
              * answers on day one.
              *
              * Kept here rather than moved out entirely: these feed the FIRST
              * generation, so an operator who already knows them saves a full
              * regeneration by typing them now.
              *
              * REVIEWS ARE NOT HERE. Every field left is one a market about to
              * launch could answer -- a crew lead can be assigned before the
              * first clean, the ZIPs can be decided. A review cannot exist
              * until a house has been cleaned, so asking for one on the screen
              * that CREATES a market is asking for something that cannot be
              * true yet. It lives on /admin/sites/<key>.
              *
              * <details>, not a client-side toggle -- this page is a plain
              * server-rendered form on purpose (see the header) and works
              * before hydration.
              */}
            <details className="rounded-md border border-border/60 p-4">
              <summary className="cursor-pointer list-none text-[0.95rem] font-semibold">
                This market is already operating
                <span className="ml-2 font-normal text-muted-foreground">optional</span>
                <span className="mt-1 block text-[0.8rem] font-normal text-muted-foreground">
                  Who cleans there, since when, and where. A competitor can describe the town; only
                  you can say this. All of it can be added later on the site&rsquo;s settings screen
                  &mdash; along with customer reviews, which is where those go &mdash; but anything
                  entered now is used by the first generation.
                </span>
              </summary>

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
                    Printed on the page exactly as typed, so round down rather than up.
                  </p>
                </div>

              </div>
            </details>

            {/*
              * What the button actually does. It starts a five-stage pipeline
              * against a real model that runs for several minutes -- nothing
              * on this screen said so, and the first thing an operator did
              * with a long-running job they did not expect was close the tab.
              */}
            <div className="rounded-md bg-muted/50 px-4 py-3 text-[0.8rem] text-muted-foreground">
              <p className="font-medium text-foreground">What happens next</p>
              <p className="mt-1">
                Research &rarr; front page &rarr; deep cleaning &rarr; area pages &rarr; service
                pages. About seven minutes. You can close the tab &mdash; reopening the page picks
                up from the last finished stage, and nothing is charged twice.
              </p>
              <p className="mt-1">Then you review it, and publish when it reads right.</p>
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
