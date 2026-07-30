import Hero from "@/components/Hero";
import FeaturedIn from "@/components/FeaturedIn";
import Intro from "@/components/Intro";
import ServiceTypes from "@/components/ServiceTypes";
import CtaBand from "@/components/CtaBand";
import Packages from "@/components/Packages";

export default function Home() {
  return (
    <main>
      <Hero />
      <FeaturedIn />
      <Intro />
      <ServiceTypes />
      <CtaBand />
      <Packages />
      <CtaBand heading={false} />
    </main>
  );
}
