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

// Moved here from src/app/layout.tsx (booking-pages fix round 1): a root
// layout's metadata is inherited per-key by any page that doesn't set its
// own, so leaving the homepage's description on the root layout was making
// EVERY page without its own description (i.e. /book-now) silently inherit
// it. Verbatim from ivycleans.html's <title>/<meta name="description">
// (front page, elementor id 2035).
export const metadata: Metadata = {
  title: "House Cleaning Service in Minneapolis Minnesota - Ivy Cleans",
  description:
    "As a local and insured business, Ivy Cleans is thrilled to be providing cleaning and janitorial services across various areas of Minneapolis. Our experienced",
};

export default function Home() {
  return (
    <main>
      <Hero />
      <FeaturedIn />
      <Intro />
      <ServiceTypes />
      <CtaBand />
      <Packages />
      <ServiceArea />
      <Values />
      <CtaBand />
      <BeforeAfter />
      <Reviews />
      <Faq />
      <CtaBand />
      <BlogPreview />
    </main>
  );
}
