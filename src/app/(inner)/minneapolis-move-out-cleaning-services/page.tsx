import type { Metadata } from "next";
import { moveOutMeta } from "@/data/move-out";
import MoveHero from "@/components/move-out/MoveHero";
import WhyMoveOut from "@/components/move-out/WhyMoveOut";
import IncludedServices from "@/components/move-out/IncludedServices";
import WhyIvy from "@/components/move-out/WhyIvy";
import Cost from "@/components/move-out/Cost";

export const metadata: Metadata = { title: moveOutMeta.title, description: moveOutMeta.description };

export default function MinneapolisMoveOutCleaningServicesPage() {
  return (
    <>
      <MoveHero />
      <WhyMoveOut />
      <IncludedServices />
      <WhyIvy />
      <Cost />
    </>
  );
}
