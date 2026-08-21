import type { Metadata } from "next";
import { cityBits } from "@/content/store";
import { cityFromParams, type CityParams } from "@/content/city-param";
import { cityHref } from "@/content/interpolate";
import { homeData } from "@/data/home";
import { servicesData } from "@/data/services";
import { areasData } from "@/data/areas";
import { siteData } from "@/data/site";
import HomeHero from "@/components/home/HomeHero";
import VideoEmbed from "@/components/home/VideoEmbed";
import HomeServices from "@/components/home/HomeServices";
import NearMe from "@/components/home/NearMe";
import HouseCleaning from "@/components/home/HouseCleaning";
import Principles from "@/components/home/Principles";
import Locations from "@/components/home/Locations";
import WorkCarousel from "@/components/home/WorkCarousel";
import HomeFaqStatic from "@/components/home/HomeFaqStatic";
import HomeCta from "@/components/home/HomeCta";

export async function generateMetadata({
  params,
}: {
  params: CityParams;
}): Promise<Metadata> {
  const { homeMeta } = homeData(await cityFromParams(params));
  return {
    title: homeMeta.title,
    description: homeMeta.description,
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
    zipParagraph,
    landmarksParagraph,
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
        zipParagraph={zipParagraph}
        landmarksParagraph={landmarksParagraph}
        mapSrc={c.maps.home}
        hasSuburbPages={c.hasSuburbPages}
      />
      <WorkCarousel workImages={workImages} />
      {/* live renders the FAQ as static text on /home, not the accordion — see HomeFaqStatic.tsx */}
      <HomeFaqStatic />
      <HomeCta innerSite={innerSite} />
      {/* live section b975f84 closes the page with a text widget holding the
          LocalBusiness JSON-LD. The widget itself measures 0px tall, but the
          section still contributes its widget-wrap gutter — a flat 20px at all
          seven probed widths — so the spacer is reproduced here. */}
      <section className="bg-white">
        <div className="ec" />
      </section>
    </>
  );
}
