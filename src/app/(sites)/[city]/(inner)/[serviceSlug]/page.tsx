import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cityFromParams } from "@/content/city-param";
import { citySlug, cityHref } from "@/content/interpolate";
import type { CityContent } from "@/content/types";
import { getCity } from "@/content/store";
import { suburbData, type SuburbRef } from "@/data/suburb";
import { siteData } from "@/data/site";
import SuburbHero from "@/components/suburb/SuburbHero";
import HouseCleaning from "@/components/suburb/HouseCleaning";
import SuburbBenefits from "@/components/suburb/Benefits";
import OtherServices from "@/components/suburb/OtherServices";
import WorkInAction from "@/components/suburb/WorkInAction";
import SuburbClosing from "@/components/suburb/Closing";

/*
 * This dynamic segment RENDERS exactly one class of value, and recognises
 * two more only to redirect them — anything else still 404s, and it must
 * never become a catch-all that swallows typos:
 *
 *   1. any stored suburb slug, c.research.suburbs[].slug — rendered here
 *   2. /deep-cleaning-<citySlug>              — 308 to /services/deep-cleaning
 *   3. /<citySlug>-move-out-cleaning-services — 308 to
 *      /services/move-in-move-out-cleaning
 *
 * Cases 2 and 3 carry the city name IN THE URL; they used to render here,
 * and are kept as permanent redirects because those URLs are indexed (see
 * resolveService below). Suburb slugs are looked up by exact match against
 * c.research.suburbs — never derived, since the live site's suburb URL
 * patterns vary (house-cleaning-*, cleaning-services-*, cleaning-service-*,
 * *-cleaning-services, all four appear in the fixtures). The literal sibling
 * routes (blog, book, contact, faq, home, cleaning-services, services, the
 * blog post) still win because Next matches static segments before dynamic
 * ones.
 *
 * No nav or body link points at cases 2 and 3 any more: src/data/site.ts and
 * src/components/home/HouseCleaning.tsx now link to /services/<slug>. The
 * only links that still land here are suburb links built from stored slugs
 * (src/data/areas.ts, ServiceArea.tsx/Locations.tsx), so slugs and hrefs
 * cannot drift.
 */
type ServiceParams = Promise<{ city: string; serviceSlug: string }>;

function serviceSlugs(c: CityContent) {
  const slug = citySlug(c.city);
  return {
    deep: `deep-cleaning-${slug}`,
    move: `${slug}-move-out-cleaning-services`,
  };
}

/**
 * Which slug this request addresses, or `notFound()`. The deep and move
 * slugs no longer render here — they redirect permanently to their
 * /services/... equivalents, since those two URLs are indexed and must
 * keep whatever search ranking they've earned instead of 404ing. The new
 * route (services/[serviceSlug]) is where service pages live now. Only a
 * suburb slug still resolves to page content here. Both the page and
 * generateMetadata dispatch through here so they can never disagree.
 */
async function resolveService(params: ServiceParams) {
  const c = await cityFromParams(params);
  const { serviceSlug } = await params;
  const slugs = serviceSlugs(c);
  if (serviceSlug === slugs.deep) {
    permanentRedirect(cityHref(c, "/services/deep-cleaning"));
  }
  if (serviceSlug === slugs.move) {
    permanentRedirect(cityHref(c, "/services/move-in-move-out-cleaning"));
  }
  const suburb = c.research.suburbs.find((s) => s.slug === serviceSlug);
  if (suburb !== undefined) return { c, suburb };
  notFound();
}

/*
 * Runs once per city emitted by the parent [city] segment's
 * generateStaticParams, receiving that city in `params` (Next merges parent
 * params into the child call — next/dist/build/static-paths/app.js). Cities
 * are re-read here rather than threaded, because generateStaticParams gets a
 * plain params object, not the request-time Promise.
 *
 * Suburb slugs are only appended when c.hasSuburbPages — a city whose suburb
 * pages are not live yet must not get real routes for slugs Areas We Serve
 * still renders unlinked (src/data/areas.ts / ServiceArea.tsx honour the same
 * flag). dynamicParams below still lets a draft preview reach an un-generated
 * suburb slug on demand.
 */
export async function generateStaticParams({ params }: { params: { city: string } }) {
  const c = await getCity(params.city);
  const { deep, move } = serviceSlugs(c);
  const slugs = [{ serviceSlug: deep }, { serviceSlug: move }];
  if (c.hasSuburbPages) {
    for (const suburb of c.research.suburbs) slugs.push({ serviceSlug: suburb.slug });
  }
  return slugs;
}

// Draft cities are not in the parent's static params, so their service pages
// render on demand at /<draftCity>/deep-cleaning-<draftCity> — the preview.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: ServiceParams;
}): Promise<Metadata> {
  const { c, suburb } = await resolveService(params);
  const { suburbMeta } = suburbData(c, suburb);
  return { title: suburbMeta.title, description: suburbMeta.description };
}

export default async function ServicePage({ params }: { params: ServiceParams }) {
  const { c, suburb } = await resolveService(params);
  return <SuburbPage c={c} suburb={suburb} />;
}

/* New for Plan 5, Task 2 — one page per suburb.slug (c.research.suburbs). */
function SuburbPage({ c, suburb }: { c: CityContent; suburb: SuburbRef }) {
  const { hero, houseCleaning, benefits, otherServices, workInAction, closing } = suburbData(
    c,
    suburb,
  );
  const { innerSite } = siteData(c);
  return (
    <>
      <SuburbHero hero={hero} bookHref={innerSite.bookUrl} />
      <HouseCleaning houseCleaning={houseCleaning} />
      <SuburbBenefits benefits={benefits} bookHref={innerSite.bookUrl} />
      <OtherServices otherServices={otherServices} />
      <WorkInAction workInAction={workInAction} />
      <SuburbClosing closing={closing} bookHref={innerSite.bookUrl} />
    </>
  );
}
