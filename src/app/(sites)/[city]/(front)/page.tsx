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
import JsonLd from "@/components/JsonLd";
import { localBusinessJsonLd } from "@/data/structured-data";
import { mapSrc } from "@/data/maps";
import BlogPreview from "@/components/BlogPreview";
import { cityBits } from "@/content/store";
import { cityFromParams, type CityParams } from "@/content/city-param";
import { t } from "@/content/interpolate";
import { siteData } from "@/data/site";
import { servicesData } from "@/data/services";
import { metaDescription } from "@/data/meta";
import { packagesData } from "@/data/packages";
import { areasData } from "@/data/areas";

// title verbatim from ivycleans.html (page 2035). Lives here, not on the root layout, so /book-now doesn't inherit it.
export async function generateMetadata({
  params,
}: {
  params: CityParams;
}): Promise<Metadata> {
  const c = await cityFromParams(params);
  const bits = cityBits(c);
  return {
    title: t("House Cleaning Service in {city} {stateName} - Ivy Cleans", bits),
    // from the page's own hero, not the old Minneapolis line
    description: metaDescription(servicesData(c).heroParagraphs[0]),
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
      {/* id="areas": the target of every area page's "Service Areas" crumb */}
      <ServiceArea
        id="areas"
        areas={areas}
        bits={bits}
        mapSrc={mapSrc(c, "front")}
        hasSuburbPages={c.hasSuburbPages}
      />
      <Values bits={bits} />
      <CtaBand site={site} bits={bits} />
      <BeforeAfter site={site} />
      <Reviews reviews={c.ops?.reviews ?? []} />
      <Faq />
      <CtaBand site={site} bits={bits} />
      <BlogPreview c={c} />
      <JsonLd data={localBusinessJsonLd(c)} />
    </main>
  );
}
