/*
 * The one place a route segment turns its [city] param into a CityContent.
 *
 * Kept out of store.ts on purpose: store.ts is imported by plain-node vitest
 * suites, and `next/navigation`'s notFound() only works inside a Next render.
 * Every page/layout/generateMetadata under app/(sites)/[city] calls this
 * instead of getDefaultCity(), so an unknown or unreadable city key 404s that
 * request only (the store rejects; we translate that into notFound()).
 */
import { notFound } from "next/navigation";
import { getCity } from "./store";
import type { CityContent } from "./types";

export type CityParams = Promise<{ city: string }>;

/** Resolves the validated city doc for a route's `params`, or 404s. */
export async function cityFromParams(params: CityParams): Promise<CityContent> {
  const { city } = await params;
  try {
    return await getCity(city);
  } catch {
    notFound();
  }
}
