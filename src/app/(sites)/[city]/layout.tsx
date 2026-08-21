import type { ReactNode } from "react";
import { listLiveCityKeys } from "@/content/store";

/*
 * The [city] segment owns the whole multi-tenant tree: the (front) and (inner)
 * route groups below it contribute no URL segment, so this is the only place
 * that can enumerate cities for the build. Params generated here are inherited
 * by every route underneath (Next walks the segment chain and merges each
 * segment's generateStaticParams — see next/dist/build/static-paths/app.js
 * generateRouteStaticParams), which is why the child [serviceSlug] segment
 * receives `{ params: { city } }` and only has to emit its own slugs.
 *
 * This layout renders `children` untouched: the [city] segment must not add a
 * single byte to any page (crawler gate) — the html/body/font shell stays in
 * the root layout and the visual chrome stays in the group layouts.
 */
export async function generateStaticParams() {
  const keys = await listLiveCityKeys();
  return keys.map((city) => ({ city }));
}

/*
 * Draft cities are NOT prebuilt (listLiveCityKeys filters status !== 'live')
 * but must still render on demand at their internal /<cityKey> paths — that
 * unguessable URL *is* the preview mechanism, so dynamicParams stays true.
 * Stated explicitly rather than left to the default because turning it off
 * would silently delete the preview feature.
 */
export const dynamicParams = true;

export default function CityLayout({ children }: { children: ReactNode }) {
  return children;
}
