import type { CityContent } from "@/server/content/types";
import { t } from "@/server/content/interpolate";
import { areasData, type Area } from "./areas";

// our SEO copy, not the live page's (live: "Blog - Ivy Cleans" / "BLOGS Ivy Cleans news")
export const blogMeta = (c: CityContent) => ({
  title: t("House Cleaning Tips & News | Ivy Cleans {city}, {state}", c),
  description: t("Cleaning tips, guides and news from Ivy Cleans, your house cleaning service in {city}, {state}.", c),
});

export type BlogCard = {
  title: string;
  href: string;
  excerpt: string;
  date: string;
  comments: string;
  category?: string;
  author?: string;
  thumb?: { src: string; width: number; height: number; alt: string; external?: true };
};

// three area pages under a post, picked from its slug so different posts link different areas
export function postAreaLinks(c: CityContent, slug: string): Area[] {
  const areas = areasData(c).areas;
  if (areas.length === 0) return [];
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const n = Math.min(3, areas.length);
  return Array.from({ length: n }, (_, i) => areas[(h + i) % areas.length]);
}
