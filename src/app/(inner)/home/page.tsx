import type { Metadata } from "next";
import { homeMeta } from "@/data/home";
import HomeHero from "@/components/home/HomeHero";
import HomeServices from "@/components/home/HomeServices";
import NearMe from "@/components/home/NearMe";
import Features from "@/components/home/Features";
import HouseCleaning from "@/components/home/HouseCleaning";
import Principles from "@/components/home/Principles";
import Locations from "@/components/home/Locations";
import WorkCarousel from "@/components/home/WorkCarousel";
import HomeCta from "@/components/home/HomeCta";

export const metadata: Metadata = { title: homeMeta.title };

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeServices />
      <NearMe />
      <Features />
      <HouseCleaning />
      <Principles />
      <Locations />
      <WorkCarousel />
      {/* FAQ section — Task 5 wires the Faq component in here */}
      <HomeCta />
    </>
  );
}
