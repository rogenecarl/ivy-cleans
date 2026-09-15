import type { Metadata } from "next";
import Breadcrumbs from "@/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/data/breadcrumbs";
import { notFound, permanentRedirect } from "next/navigation";
import { cityFromParams } from "@/content/city-param";
import { citySlug, cityHref } from "@/content/interpolate";
import type { CityContent } from "@/content/types";
import { getCity } from "@/content/store";
import { suburbData, type SuburbRef } from "@/data/suburb";
import { siteData } from "@/data/site";
import { isLegacyPostSlug } from "@/data/legacy-posts";
import SuburbHero from "@/components/suburb/SuburbHero";
import HouseCleaning from "@/components/suburb/HouseCleaning";
import SuburbBenefits from "@/components/suburb/Benefits";
import OtherServices from "@/components/suburb/OtherServices";
import NearbyAreas from "@/components/suburb/NearbyAreas";
import WorkInAction from "@/components/suburb/WorkInAction";
import SuburbClosing from "@/components/suburb/Closing";

// Root-level slugs: stored suburb slugs render here; /deep-cleaning-<city> and /<city>-move-out-cleaning-services
// 308 to /services/..., and the WordPress-era post slugs 308 to /blog (all indexed URLs). Anything else 404s.
// Static sibling routes win because Next matches them first.
type SlugParams = Promise<{ city: string; slug: string }>;

function redirectSlugs(c: CityContent) {
  const slug = citySlug(c.city);
  return {
    deep: `deep-cleaning-${slug}`,
    move: `${slug}-move-out-cleaning-services`,
  };
}

type Resolved = { c: CityContent; suburb: SuburbRef };

// which slug this request addresses, or notFound(); page and generateMetadata both dispatch through here
async function resolveSlug(params: SlugParams): Promise<Resolved> {
  const c = await cityFromParams(params);
  const { slug } = await params;
  const redirects = redirectSlugs(c);
  if (slug === redirects.deep) {
    permanentRedirect(cityHref(c, "/services/deep-cleaning"));
  }
  if (slug === redirects.move) {
    permanentRedirect(cityHref(c, "/services/move-in-move-out-cleaning"));
  }
  if (isLegacyPostSlug(slug)) permanentRedirect(cityHref(c, "/blog"));
  const suburb = c.research.suburbs.find((s) => s.slug === slug);
  if (suburb !== undefined) return { c, suburb };
  notFound();
}

// runs once per city from the parent segment's params. Suburb slugs only when hasSuburbPages.
export async function generateStaticParams({ params }: { params: { city: string } }) {
  const c = await getCity(params.city);
  const { deep, move } = redirectSlugs(c);
  const slugs = [{ slug: deep }, { slug: move }];
  if (c.hasSuburbPages) {
    for (const suburb of c.research.suburbs) slugs.push({ slug: suburb.slug });
  }
  return slugs;
}

// Draft cities are not in the parent's static params, so their pages render
// on demand at /<draftCity>/<slug> — the preview.
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: SlugParams }): Promise<Metadata> {
  const resolved = await resolveSlug(params);
  const { suburbMeta } = suburbData(resolved.c, resolved.suburb);
  return { title: suburbMeta.title, description: suburbMeta.description };
}

export default async function InnerSlugPage({ params }: { params: SlugParams }) {
  const resolved = await resolveSlug(params);
  return <SuburbPage c={resolved.c} suburb={resolved.suburb} />;
}

/* New for Plan 5, Task 2 — one page per suburb.slug (c.research.suburbs). */
function SuburbPage({ c, suburb }: { c: CityContent; suburb: SuburbRef }) {
  const { hero, houseCleaning, benefits, nearby, otherServices, workInAction, closing } = suburbData(
    c,
    suburb,
  );
  const { innerSite } = siteData(c);
  return (
    <>
      <Breadcrumbs trail={breadcrumbs(c, { kind: "area", name: suburb.name, slug: suburb.slug })} />
      <SuburbHero hero={hero} bookHref={innerSite.bookUrl} />
      <HouseCleaning houseCleaning={houseCleaning} />
      <SuburbBenefits benefits={benefits} bookHref={innerSite.bookUrl} />
      <NearbyAreas nearby={nearby} />
      <OtherServices otherServices={otherServices} />
      <WorkInAction workInAction={workInAction} />
      <SuburbClosing closing={closing} bookHref={innerSite.bookUrl} />
    </>
  );
}
