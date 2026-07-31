import type { Metadata } from "next";
import { csMeta, rooms } from "@/data/cleaning-services";
import PlansHeader from "@/components/cleaning-services/PlansHeader";
import PackagesBar from "@/components/cleaning-services/PackagesBar";
import RoomChecklist from "@/components/cleaning-services/RoomChecklist";

export const metadata: Metadata = { title: csMeta.title };

export default function CleaningServicesPage() {
  return (
    <>
      <PlansHeader />
      <PackagesBar />
      {rooms.map((r) => (
        <RoomChecklist key={r.name} room={r} />
      ))}
    </>
  );
}
