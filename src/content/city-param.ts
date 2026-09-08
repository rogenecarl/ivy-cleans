// [city] param -> CityContent, or notFound(). Kept out of store.ts: notFound() only works inside a Next render.
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
