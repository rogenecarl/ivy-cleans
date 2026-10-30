import type { Metadata } from "next";
import { canonicalFor } from "@/site/data/seo";
import { cityBits } from "@/server/content/store";
import { cityFromParams, type CityParams } from "@/site/city-param";
import { cityHref } from "@/server/content/interpolate";
import { homeData } from "@/site/data/home";
import { servicesData } from "@/site/data/services";
import { areasData } from "@/site/data/areas";
import { siteData } from "@/site/data/site";
import HomeHero from "@/site/components/home/HomeHero";
import VideoEmbed from "@/site/components/home/VideoEmbed";
import HomeServices from "@/site/components/home/HomeServices";
import NearMe from "@/site/components/home/NearMe";
import HouseCleaning from "@/site/components/home/HouseCleaning";
import Principles from "@/site/components/home/Principles";
import Locations from "@/site/components/home/Locations";
import WorkCarousel from "@/site/components/home/WorkCarousel";
import HomeFaqStatic from "@/site/components/home/HomeFaqStatic";
import HomeCta from "@/site/components/home/HomeCta";
import { mapSrc } from "@/site/data/maps";

export async function generateMetadata({
  params,
}: {
  params: CityParams;
}): Promise<Metadata> {
  const c = await cityFromParams(params);
  const { homeMeta } = homeData(c);
  return {
    title: homeMeta.title,
    description: homeMeta.description,
    ...canonicalFor(c, "/home"),
  };
}

export default async function HomePage({ params }: { params: CityParams }) {
  const c = await cityFromParams(params);
  const bits = cityBits(c);
  const {
    nearMe,
    features,
    featuresOutro,
    houseCleaning,
    principles,
    zips,
    workImages,
  } = homeData(c);
  const { heroParagraphs, serviceIntro, services } = servicesData(c);
  const { areas } = areasData(c);
  const { innerSite } = siteData(c);
  return (
    <>
      <HomeHero heroParagraphs={heroParagraphs} innerSite={innerSite} bits={bits} />
      {/* live section ff4b242: YouTube embed, right after the hero */}
      <VideoEmbed />
      <HomeServices
        serviceIntro={serviceIntro}
        services={services}
        innerSite={innerSite}
        bits={bits}
      />
      {/* Features renders inside NearMe — section 102673a0 wraps both (see NearMe.tsx) */}
      <NearMe nearMe={nearMe} features={features} featuresOutro={featuresOutro} bits={bits} />
      <HouseCleaning
        houseCleaning={houseCleaning}
        bits={bits}
        deepHref={cityHref(c, "/services/deep-cleaning")}
        moveOutHref={cityHref(c, "/services/move-in-move-out-cleaning")}
      />
      <Principles principles={principles} />
      {/* Locations also renders the Google Maps embed (section 6455f48) between
          its heading and its location-list paragraphs — see Locations.tsx */}
      <Locations
        areas={areas}
        zips={zips}
        mapSrc={mapSrc(c, "home")}
        hasSuburbPages={c.hasSuburbPages}
      />
      <WorkCarousel workImages={workImages} />
      {/* live renders the FAQ as static text on /home, not the accordion — see HomeFaqStatic.tsx */}
      <HomeFaqStatic />
      <HomeCta innerSite={innerSite} />
      {/* b975f84: the live JSON-LD section is 0px tall but still adds its 20px gutter */}
      <section className="bg-white">
        <div className="ec" />
      </section>
    </>
  );
}
