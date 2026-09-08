import type { CityContent } from '../content/types'
import { cityHref } from '../content/interpolate'

export type Area = { name: string; href: string };

export type AreasData = {
  areas: Area[];
};

// per-city suburb list; slugs are stored, never derived. hasSuburbPages false renders the names unlinked.
export function areasData(c: CityContent): AreasData {
  return {
    areas: c.research.suburbs.map((sub) => ({
      name: sub.name,
      // Draft cities get the /<cityKey> preview prefix; live cities are unchanged.
      href: cityHref(c, `/${sub.slug}`),
    })),
  };
}
