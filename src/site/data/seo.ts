// One deployment serves every city, so the same page answers on a city's domain and at /<key> on the operator's host.
import type { Metadata } from "next";
import domains from "@content/_domains.json";
import { cityKeyOf } from "@/server/content/interpolate";
import type { CityContent } from "@/server/content/types";

// a city's own domain is the one copy search engines should keep
export function canonicalFor(c: Pick<CityContent, "status" | "domain">, path: string): Metadata {
  if (c.status !== "live" || !c.domain) return {};
  return { alternates: { canonical: `https://${c.domain}${path === "/" ? "" : path}` } };
}

// a draft, or a live city with only its /<key> path, stays out of the index; the default city has the operator's host
export function cityRobots(c: Pick<CityContent, "city" | "status" | "domain">): Metadata {
  const indexable = c.status === "live" && (Boolean(c.domain) || cityKeyOf(c) === domains.default);
  return indexable ? {} : { robots: { index: false, follow: false } };
}
