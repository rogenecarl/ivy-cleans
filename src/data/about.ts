import type { CityContent, MarketPhoto, MarketReview } from '../content/types'
import { cityHref, realAddress } from '../content/interpolate'
import { ABOUT_STORY_SLOT, aboutReady, sinceLabel } from '../pipeline/about'

export { aboutReady }

/** Stands in for the crew photo until one is uploaded; a caption containing "crew" marks the real one. */
export const CREW_PLACEHOLDER: MarketPhoto = { path: '/images/crew-placeholder.svg', alt: 'Crew photo coming soon' }

export type AboutData = {
  meta: { title: string; description: string }
  h1: string
  facts: { label: string; value: string }[]
  story: string[] | undefined
  crew: { lead: string | undefined; photo: MarketPhoto; placeholder: boolean }
  reviews: MarketReview[]
  photos: MarketPhoto[]
  contact: { phone: string; phoneHref: string; address: string | undefined; contactHref: string; bookHref: string }
}

/** Everything the About page prints, all of it from the operator's own facts; the story is the one model-written passage. */
export function aboutData(c: CityContent): AboutData {
  const ops = c.ops ?? {}
  const facts: AboutData['facts'] = []
  if (ops.servingSince) facts.push({ label: `Serving ${c.city} since`, value: sinceLabel(ops.servingSince) })
  if (ops.crewSize !== undefined) facts.push({ label: 'Crew', value: `${ops.crewSize} people` })
  if (ops.homesCleaned !== undefined) facts.push({ label: 'Homes cleaned here', value: ops.homesCleaned.toLocaleString('en-US') })

  const storyRaw = c.sections[ABOUT_STORY_SLOT]
  const story = Array.isArray(storyRaw) && storyRaw.length ? storyRaw : undefined
  const photos = ops.photos ?? []
  const crewPhoto = photos.find((p) => /\bcrew\b/i.test(p.alt))

  return {
    meta: {
      title: `About Ivy Cleans in ${c.city}, ${c.state} | Ivy Cleans`,
      description: [
        `Ivy Cleans in ${c.city}`,
        ops.servingSince ? `serving since ${sinceLabel(ops.servingSince)}` : '',
        ops.crewLead ? `led by ${ops.crewLead}` : '',
      ]
        .filter(Boolean)
        .join(', ')
        .concat('. Who we are and what customers here say.'),
    },
    h1: `About Ivy Cleans in ${c.city}`,
    facts,
    story,
    crew: { lead: ops.crewLead, photo: crewPhoto ?? CREW_PLACEHOLDER, placeholder: crewPhoto === undefined },
    reviews: ops.reviews ?? [],
    photos: photos.filter((p) => p !== crewPhoto),
    contact: {
      phone: c.phone,
      phoneHref: c.phoneHref,
      address: realAddress(c.address),
      contactHref: cityHref(c, '/contact'),
      bookHref: cityHref(c, '/book'),
    },
  }
}
