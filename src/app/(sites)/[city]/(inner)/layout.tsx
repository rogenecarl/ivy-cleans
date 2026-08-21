import InnerHeader from "@/components/inner/InnerHeader";
import InnerFooter from "@/components/inner/InnerFooter";
import { cityFromParams, type CityParams } from "@/content/city-param";
import { cityHref } from "@/content/interpolate";
import { siteData } from "@/data/site";

export default async function InnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: CityParams;
}) {
  const c = await cityFromParams(params);
  // InnerHeader's active-nav check needs the URL prefix this tenant renders
  // under, so it can compare a public href against a prerendered pathname.
  const { city: cityKey } = await params;
  const { site, innerSite } = siteData(c);
  return (
    <div className="tpl-inner">
      <InnerHeader site={site} cityKey={cityKey} homeHref={cityHref(c, "/")} />
      {children}
      <InnerFooter site={site} innerSite={innerSite} />
    </div>
  );
}
