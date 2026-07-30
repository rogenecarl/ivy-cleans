import Hero from "@/components/Hero";
import FeaturedIn from "@/components/FeaturedIn";
import Intro from "@/components/Intro";
import ServiceTypes from "@/components/ServiceTypes";
import CtaBand from "@/components/CtaBand";

export default function Home() {
  return (
    <main>
      <Hero />
      <FeaturedIn />
      <Intro />
      <ServiceTypes />
      <CtaBand />
    </main>
  );
}
