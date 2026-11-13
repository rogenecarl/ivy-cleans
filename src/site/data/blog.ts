import type { CityContent } from "@/server/content/types";
import { t } from "@/server/content/interpolate";

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
