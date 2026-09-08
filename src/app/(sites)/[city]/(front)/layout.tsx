import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cityFromParams, type CityParams } from "@/content/city-param";
import { cityHref } from "@/content/interpolate";
import { siteData } from "@/data/site";

export default async function FrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: CityParams;
}) {
  const c = await cityFromParams(params);
  const { site, innerSite } = siteData(c);
  // footer Quick Links, verbatim from post-2342.css, built here so they go through cityHref
  const quickLinks = [
    { label: "Home", href: cityHref(c, "/") },
    { label: "Blog", href: cityHref(c, "/blog") },
    { label: "Contact", href: cityHref(c, "/contact") },
    { label: "FAQ", href: cityHref(c, "/faq") },
  ];
  return (
    <>
      <TopBar site={site} homeHref={cityHref(c, "/")} />
      <Header site={site} />
      {children}
      <Footer site={site} innerSite={innerSite} quickLinks={quickLinks} />
    </>
  );
}
