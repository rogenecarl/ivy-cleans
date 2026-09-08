import type { Metadata } from "next";
import Breadcrumbs from "@/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/data/breadcrumbs";
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
  const c = await cityFromParams(params);
  const { innerSite } = siteData(c);
  return (
    <>
      <Breadcrumbs
        trail={breadcrumbs(c, { kind: "page", label: "Cleaning Services", path: "/cleaning-services" })}
      />
      <PlansHeader />
      <PackagesBar innerSite={innerSite} />
      {rooms.map((r, i) => (
        <RoomChecklist key={r.name} room={r} last={i === rooms.length - 1} />
      ))}
    </>
  );
}
