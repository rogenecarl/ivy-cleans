import type { CityContent } from '../content/types'
import { cityHref } from '../content/interpolate'

export type Area = { name: string; href: string };

export type AreasData = {
  areas: Area[];
};

/*
 * RESEARCH-class: the suburb list is per-city (Claude research in Plan 3).
 * Slugs are stored, never derived — the live site's URL patterns vary
 * (house-cleaning-*, cleaning-services-*, cleaning-service-*, *-cleaning-services).
 * Suburb pages are still out of scope, so a city with `hasSuburbPages: false`
 * renders these names UNLINKED (ServiceArea/Locations honour the flag) — the
 * hrefs below are still computed so the data shape stays uniform, they are
 * simply not turned into anchors. Minneapolis's 24 routes are the only real ones.
 */
export function areasData(c: CityContent): AreasData {
  return {
    areas: c.research.suburbs.map((sub) => ({
      name: sub.name,
      // Draft cities get the /<cityKey> preview prefix; live cities are unchanged.
      href: cityHref(c, `/${sub.slug}`),
    })),
  };
}
