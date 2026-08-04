import type { Metadata } from "next";
import { homeMeta } from "@/data/home";
import HomeHero from "@/components/home/HomeHero";
import HomeServices from "@/components/home/HomeServices";
import NearMe from "@/components/home/NearMe";
import HouseCleaning from "@/components/home/HouseCleaning";
import Principles from "@/components/home/Principles";
import Locations from "@/components/home/Locations";
import WorkCarousel from "@/components/home/WorkCarousel";
import HomeCta from "@/components/home/HomeCta";
import Faq from "@/components/Faq";

export const metadata: Metadata = { title: homeMeta.title };

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeServices />
      {/* Features renders inside NearMe — section 102673a0 wraps both (see NearMe.tsx) */}
      <NearMe />
      <HouseCleaning />
      <Principles />
      <Locations />
      <WorkCarousel />
      <Faq subtitle={false} questionsHeading="Do you have any Questions?" />
      <HomeCta />
    </>
  );
}
