import type { Metadata } from "next";
import { homeMeta } from "@/data/home";
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

export const metadata: Metadata = {
  title: homeMeta.title,
  description: homeMeta.description,
};

export default function HomePage() {
  return (
    <>
      <HomeHero />
      {/* live section ff4b242: YouTube embed, right after the hero */}
      <VideoEmbed />
      <HomeServices />
      {/* Features renders inside NearMe — section 102673a0 wraps both (see NearMe.tsx) */}
      <NearMe />
      <HouseCleaning />
      <Principles />
      {/* Locations also renders the Google Maps embed (section 6455f48) between
          its heading and its location-list paragraphs — see Locations.tsx */}
      <Locations />
      <WorkCarousel />
      {/* live renders the FAQ as static text on /home, not the accordion — see HomeFaqStatic.tsx */}
      <HomeFaqStatic />
      <HomeCta />
    </>
  );
}
