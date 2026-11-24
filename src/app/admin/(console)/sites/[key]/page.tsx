import Link from 'next/link'
import { ChevronLeft, TriangleAlert } from 'lucide-react'
import { ExternalLink } from 'lucide-react'
import { formatOpsFields, readMarketLogic } from '@/server/pipeline/admin-logic'
import { aboutMissing } from '@/server/pipeline/about'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ADMIN_SITES } from '@/server/auth/admin-routes'
import { Button } from '@/components/ui/button'
import { ErrorText, Panel } from '@/app/admin/_components/ui'
import { FactsForm } from './facts-form'
import { ContactForm } from './contact-form'
import { PhotosPanel } from './photos-panel'
import { StoryPanel } from './story-panel'
import { requireAdmin } from '@/server/auth/auth-server'

export const dynamic = 'force-dynamic'

// Next 16: both params and searchParams are Promises and must be awaited.

export default async function SiteSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>
  searchParams: Promise<{ error?: string }>
}) {
  // own guard: admin-only
  await requireAdmin()

  const { key } = await params
  const { error } = await searchParams
  const market = await readMarketLogic(key)

  return (
    <>
      <Link
        href={ADMIN_SITES}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-sm text-[0.85rem] text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Sites
      </Link>
      <h1 className="mt-2 mb-6 text-[1.4rem] font-semibold tracking-tight">{key} settings</h1>

      {error && <ErrorText>{error}</ErrorText>}

      {market.ok && (
        <Panel title="Phone and address">
          {market.address === '' && (
            <p className="mb-3 text-[0.8rem] text-amber-800">No street address yet, so this city can&rsquo;t be published.</p>
          )}
          <ContactForm cityKey={key} phone={market.phone} address={market.address} />
        </Panel>
      )}

      {/* About Us: every fact is typed by the operator; the page stays off the site until it has a year and a photo */}
      <h2 id="about" className="mt-10 mb-1 scroll-mt-6 text-[1.15rem] font-semibold tracking-tight">About Us page</h2>
      {market.ok ? (
        <>
          <AboutStatus missing={aboutMissing(market.ops)} cityKey={key} />

          <Panel title="Facts">
            <p className="mb-4 text-[0.8rem] text-muted-foreground">
              All optional, all printed as typed. Only you can say who cleans here, since when, and what a customer
              actually said. Nothing here is written by the model.
            </p>
            <FactsForm cityKey={key} fields={formatOpsFields(market.ops)} />
          </Panel>

          <Panel title="Photos">
            <p className="mb-4 text-[0.8rem] text-muted-foreground">
              Real photos of this branch. They appear on the About Us page and in the gallery on every area page.
            </p>
            <PhotosPanel cityKey={key} photos={market.ops?.photos ?? []} />
          </Panel>

          <Panel title="Story">
            <StoryPanel cityKey={key} story={market.story} ready={aboutMissing(market.ops).length === 0} />
          </Panel>
        </>
      ) : (
        <Alert variant="destructive" className="mt-3">
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertTitle>This city has no draft or published document.</AlertTitle>
          <AlertDescription>Generate the city first; there is nowhere to keep its About Us facts yet.</AlertDescription>
        </Alert>
      )}
    </>
  )
}

function AboutStatus({ missing, cityKey }: { missing: string[]; cityKey: string }) {
  if (missing.length === 0) {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3 text-[0.85rem]">
        <span className="rounded-full border border-green-600/30 bg-green-50 px-2.5 py-0.5 text-green-700">On</span>
        <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-8">
          <a href={`/${cityKey}/about`} target="_blank" rel="noreferrer">
            Open the page
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </Button>
      </div>
    )
  }
  return (
    <p className="mb-4 text-[0.85rem] text-muted-foreground">
      <span className="rounded-full border border-amber-600/30 bg-amber-50 px-2.5 py-0.5 text-amber-700">Off</span>
      <span className="ml-2">It publishes once it has {missing.join(' and ')}. A crew lead, reviews and the rest make it better; they are not required.</span>
    </p>
  )
}
