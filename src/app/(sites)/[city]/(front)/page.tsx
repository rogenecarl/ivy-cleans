import type { Metadata } from "next";
import Hero from "@/components/Hero";
import FeaturedIn from "@/components/FeaturedIn";
import Intro from "@/components/Intro";
import ServiceTypes from "@/components/ServiceTypes";
import CtaBand from "@/components/CtaBand";
import Packages from "@/components/Packages";
import ServiceArea from "@/components/ServiceArea";
import Values from "@/components/Values";
import BeforeAfter from "@/components/BeforeAfter";
import Reviews from "@/components/Reviews";
import Faq from "@/components/Faq";
import BlogPreview from "@/components/BlogPreview";
import { cityBits } from "@/content/store";
import { cityFromParams, type CityParams } from "@/content/city-param";
import { t } from "@/content/interpolate";
import { siteData } from "@/data/site";
import { servicesData } from "@/data/services";
import { packagesData } from "@/data/packages";
import { areasData } from "@/data/areas";

// Moved here from src/app/layout.tsx (booking-pages fix round 1): a root
// layout's metadata is inherited per-key by any page that doesn't set its
// own, so leaving the homepage's description on the root layout was making
// EVERY page without its own description (i.e. /book-now) silently inherit
// it. Verbatim from ivycleans.html's <title>/<meta name="description">
// (front page, elementor id 2035), with only the {city} token swapped in.
export async function generateMetadata({
  params,
}: {
  params: CityParams;
}): Promise<Metadata> {
  const bits = cityBits(await cityFromParams(params));
  return {
    title: t("House Cleaning Service in {city} {stateName} - Ivy Cleans", bits),
    description: t(
      "As a local and insured business, Ivy Cleans is thrilled to be providing cleaning and janitorial services across various areas of {city}. Our experienced",
      bits,
    ),
  };
}

export default async function Home({ params }: { params: CityParams }) {
  const c = await cityFromParams(params);
  const bits = cityBits(c);
  const { site } = siteData(c);
  const { heroParagraphs, serviceIntro, services } = servicesData(c);
  const { packagesIntro, packages } = packagesData(c);
  const { areas } = areasData(c);
  return (
    <main>
      <Hero site={site} heroParagraphs={heroParagraphs} bits={bits} />
      <FeaturedIn />
      <Intro serviceIntro={serviceIntro} bits={bits} />
      <ServiceTypes services={services} />
      <CtaBand site={site} bits={bits} />
      <Packages packagesIntro={packagesIntro} packages={packages} site={site} />
      <ServiceArea
        areas={areas}
        bits={bits}
        mapSrc={c.maps.front}
        hasSuburbPages={c.hasSuburbPages}
      />
      <Values bits={bits} />
      <CtaBand site={site} bits={bits} />
      <BeforeAfter site={site} />
      <Reviews site={site} bits={bits} />
      <Faq />
      <CtaBand site={site} bits={bits} />
      <BlogPreview />
    </main>
  );
}
