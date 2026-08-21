import type { Metadata } from "next";
import { csMeta, rooms } from "@/data/cleaning-services";
import { cityFromParams, type CityParams } from "@/content/city-param";
import { siteData } from "@/data/site";
import PlansHeader from "@/components/cleaning-services/PlansHeader";
import PackagesBar from "@/components/cleaning-services/PackagesBar";
import RoomChecklist from "@/components/cleaning-services/RoomChecklist";

export const metadata: Metadata = {
  title: csMeta.title,
  description: csMeta.description,
};

export default async function CleaningServicesPage({ params }: { params: CityParams }) {
  const { innerSite } = siteData(await cityFromParams(params));
  return (
    <>
      <PlansHeader />
      <PackagesBar innerSite={innerSite} />
      {rooms.map((r, i) => (
        <RoomChecklist key={r.name} room={r} last={i === rooms.length - 1} />
      ))}
    </>
  );
}
