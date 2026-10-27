import type { Metadata } from "next";
import Breadcrumbs from "@/site/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/site/data/breadcrumbs";
import { csMeta, rooms } from "@/site/data/cleaning-services";
import { cityFromParams, type CityParams } from "@/site/city-param";
import { siteData } from "@/site/data/site";
import PlansHeader from "@/site/components/cleaning-services/PlansHeader";
import PackagesBar from "@/site/components/cleaning-services/PackagesBar";
import RoomChecklist from "@/site/components/cleaning-services/RoomChecklist";

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
