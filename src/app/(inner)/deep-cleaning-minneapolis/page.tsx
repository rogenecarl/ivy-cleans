import type { Metadata } from "next";
import { deepMeta } from "@/data/deep-cleaning";
import DeepHero from "@/components/deep-cleaning/DeepHero";
import WhatIs from "@/components/deep-cleaning/WhatIs";
import Benefits from "@/components/deep-cleaning/Benefits";
import DeepServices from "@/components/deep-cleaning/DeepServices";
import WhyChoose from "@/components/deep-cleaning/WhyChoose";

export const metadata: Metadata = { title: deepMeta.title, description: deepMeta.description };

export default function DeepCleaningMinneapolisPage() {
  return (
    <>
      <DeepHero />
      <WhatIs />
      <Benefits />
      <DeepServices />
      <WhyChoose />
    </>
  );
}
