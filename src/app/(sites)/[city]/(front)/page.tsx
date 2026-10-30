import type { Metadata } from "next";
import { canonicalFor } from "@/site/data/seo";
import Hero from "@/site/components/Hero";
import FeaturedIn from "@/site/components/FeaturedIn";
import Intro from "@/site/components/Intro";
import ServiceTypes from "@/site/components/ServiceTypes";
import CtaBand from "@/site/components/CtaBand";
import Packages from "@/site/components/Packages";
import ServiceArea from "@/site/components/ServiceArea";
import Values from "@/site/components/Values";
import BeforeAfter from "@/site/components/BeforeAfter";
import Reviews from "@/site/components/Reviews";
import Faq from "@/site/components/Faq";
import JsonLd from "@/site/components/JsonLd";
import { localBusinessJsonLd } from "@/site/data/structured-data";
import { mapSrc } from "@/site/data/maps";
import BlogPreview from "@/site/components/BlogPreview";
import { cityBits } from "@/server/content/store";
import { listPosts } from "@/server/blog/store";
import { cityKeyOf } from "@/server/content/interpolate";
import { cityFromParams, type CityParams } from "@/site/city-param";
import { t } from "@/server/content/interpolate";
import { siteData } from "@/site/data/site";
import { servicesData } from "@/site/data/services";
import { metaDescription } from "@/site/data/meta";
import { packagesData } from "@/site/data/packages";
import { areasData } from "@/site/data/areas";

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
    ...canonicalFor(c, "/"),
  };
}

export default async function Home({ params }: { params: CityParams }) {
  const c = await cityFromParams(params);
  const bits = cityBits(c);
  // the store is optional here: a database outage must not take the front page down
  const posts = await listPosts(cityKeyOf(c)).catch(() => []);
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
      <BlogPreview c={c} posts={posts} />
      <JsonLd data={localBusinessJsonLd(c)} />
    </main>
  );
}
