import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cityFromParams } from "@/content/city-param";
import type { CityContent } from "@/content/types";
import { SERVICE_SLUGS, serviceBySlug } from "@/data/services/registry";
import type { ServiceContent } from "@/data/service-types";
import { moveOutData } from "@/data/move-out";
import { siteData } from "@/data/site";
import Hero from "@/components/service/Hero";
import WhatIs from "@/components/service/WhatIs";
import Benefits from "@/components/service/Benefits";
import ServicesList from "@/components/service/ServicesList";
import WhyChoose from "@/components/service/WhyChoose";
import MoveHero from "@/components/move-out/MoveHero";
import WhyMoveOut from "@/components/move-out/WhyMoveOut";
import IncludedServices from "@/components/move-out/IncludedServices";
import WhyIvy from "@/components/move-out/WhyIvy";
import Cost from "@/components/move-out/Cost";

/*
 * The shared-template home for all seven services. Only two are registered
 * in src/data/services/registry.ts today (deep-cleaning as `template`,
 * move-in-move-out-cleaning as `bespoke`); the other five slugs 404 here
 * until they get registered — resolveService() below is what makes that
 * happen for free, since serviceBySlug() returns undefined for them.
 *
 * This route runs ALONGSIDE the older [serviceSlug] catch-all, which still
 * owns every suburb slug but no longer renders /deep-cleaning-<city> or
 * /<city>-move-out-cleaning-services — those two are indexed elsewhere, so
 * it permanently redirects them here instead of 404ing. Nothing here
 * modifies that route or its components.
 */
type ServiceParams = Promise<{ city: string; serviceSlug: string }>;

async function resolveService(params: ServiceParams) {
  const c = await cityFromParams(params);
  const { serviceSlug } = await params;
  const entry = serviceBySlug(serviceSlug);
  if (entry === undefined) notFound();
  return { c, entry };
}

/*
 * Emits all seven SERVICE_SLUGS, unconditionally and without touching
 * `params` — unlike the sibling [serviceSlug] route, whose suburb slugs are
 * per-city data read from c.research.suburbs, these seven slugs are the
 * same for every city, so nothing here needs to know which city is being
 * generated. All seven are emitted regardless of which are registered: an
 * unregistered slug's page calls notFound() at render, which Next handles
 * as a per-route 404 rather than a build failure (next/dist/docs/01-app/
 * 03-api-reference/04-functions/not-found.md).
 */
export async function generateStaticParams() {
  return SERVICE_SLUGS.map((serviceSlug) => ({ serviceSlug }));
}

// Draft cities are not in the parent's static params, so their service
// pages render on demand at /<draftCity>/services/<slug> — the preview.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: ServiceParams;
}): Promise<Metadata> {
  const { c, entry } = await resolveService(params);
  if (entry.kind === "template") {
    const { meta } = entry.content(c);
    return { title: meta.title, description: meta.description };
  }
  const { moveOutMeta } = moveOutData(c);
  return { title: moveOutMeta.title, description: moveOutMeta.description };
}

export default async function ServicePage({ params }: { params: ServiceParams }) {
  const { c, entry } = await resolveService(params);
  if (entry.kind === "template") return <TemplateService c={c} content={entry.content} />;
  return <MoveOutPage c={c} />;
}

/* Was DeepCleaningPage in the old [serviceSlug] route — JSX unchanged, now
 * driven by whichever template entry's content() the registry resolves. */
function TemplateService({
  c,
  content,
}: {
  c: CityContent;
  content: (c: CityContent) => ServiceContent;
}) {
  const {
    hero,
    whatIs,
    benefits,
    benefitsBgImage,
    services,
    servicesLinkHref,
    servicesLinkedItemIndex,
    whyChoose,
  } = content(c);
  // The four "Set an appointment" CTAs used to hardcode "/book"; sourcing them
  // from innerSite keeps a draft city's preview inside its own tree.
  const { innerSite } = siteData(c);
  return (
    <>
      <Hero hero={hero} bookHref={innerSite.bookUrl} />
      <WhatIs whatIs={whatIs} />
      <Benefits
        benefits={benefits}
        benefitsBgImage={benefitsBgImage}
        bookHref={innerSite.bookUrl}
      />
      <ServicesList
        services={services}
        servicesLinkHref={servicesLinkHref}
        servicesLinkedItemIndex={servicesLinkedItemIndex}
        bookHref={innerSite.bookUrl}
      />
      <WhyChoose whyChoose={whyChoose} bookHref={innerSite.bookUrl} />
    </>
  );
}

/* Was MoveOutPage in the old [serviceSlug] route — JSX unchanged, moved
 * across rather than the move-out components themselves. */
function MoveOutPage({ c }: { c: CityContent }) {
  const { moveHero, whyMoveOut, included, whyIvy, cost } = moveOutData(c);
  const { innerSite } = siteData(c);
  return (
    <>
      <MoveHero moveHero={moveHero} bookHref={innerSite.bookUrl} />
      <WhyMoveOut whyMoveOut={whyMoveOut} bookHref={innerSite.bookUrl} />
      <IncludedServices included={included} />
      <WhyIvy whyIvy={whyIvy} />
      <Cost cost={cost} bookHref={innerSite.bookUrl} />
    </>
  );
}
