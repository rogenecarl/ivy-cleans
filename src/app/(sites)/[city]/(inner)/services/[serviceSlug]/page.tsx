import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cityFromParams } from "@/content/city-param";
import type { CityContent } from "@/content/types";
import { SERVICE_SLUGS, serviceBySlug, serviceTitle } from "@/data/services/registry";
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
import ServiceArea from "@/components/ServiceArea";
import Breadcrumbs from "@/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/data/breadcrumbs";
import { areasData } from "@/data/areas";
import { cityBits } from "@/content/store";
import type { ServiceEntry } from "@/data/services/registry";

// Shared home for all seven services; an unregistered slug 404s via resolveService(). The [slug] route still owns
// suburb slugs and redirects the two old service URLs here.
type ServiceParams = Promise<{ city: string; serviceSlug: string }>;

async function resolveService(params: ServiceParams) {
  const c = await cityFromParams(params);
  const { serviceSlug } = await params;
  const entry = serviceBySlug(serviceSlug);
  if (entry === undefined) notFound();
  return { c, entry };
}

// all seven slugs, the same for every city; an unregistered one 404s at render, not at build
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
  // One title pattern for all seven (item 12); the description is still each
  // service's own.
  const title = serviceTitle(entry, c);
  if (entry.kind === "template") {
    const { meta } = entry.content(c);
    return { title, description: meta.description };
  }
  const { moveOutMeta } = moveOutData(c);
  return { title, description: moveOutMeta.description };
}

export default async function ServicePage({ params }: { params: ServiceParams }) {
  const { c, entry } = await resolveService(params);
  return (
    <>
      <Breadcrumbs trail={breadcrumbs(c, { kind: "service", slug: entry.slug })} />
      {entry.kind === "template" ? (
        <TemplateService c={c} content={entry.content} />
      ) : (
        <MoveOutPage c={c} />
      )}
      <WhereWeDoIt c={c} entry={entry} />
    </>
  );
}

// every service page links every area: same block, map and hasSuburbPages rule as the front page
function WhereWeDoIt({ c, entry }: { c: CityContent; entry: ServiceEntry }) {
  return (
    <ServiceArea
      areas={areasData(c).areas}
      bits={cityBits(c)}
      mapSrc={c.maps.front}
      hasSuburbPages={c.hasSuburbPages}
      heading={{ title: `Where we do ${entry.name} in ${c.city}` }}
    />
  );
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
