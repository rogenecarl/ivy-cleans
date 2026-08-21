// src/data/services.ts
import type { CityContent } from '../content/types'
import { s, sl } from '../content/slots'
import { t } from '../content/interpolate'

export type Service = { title: string; text: string; image: string; alt: string; width: number; height: number };

export type ServicesData = {
  heroParagraphs: string[];
  serviceIntro: string[];
  services: Service[];
};

/* AI-class copy (per the content contract) comes from city sections; only
 * the card titles, images and dimensions are fixed template structure.
 * Alt templates use {cityLower} verbatim (no slugging) — for a multi-word
 * city ("St. Louis Park") they render with spaces/periods, faithfully
 * reproducing the live site's inconsistent alt conventions. */
export function servicesData(c: CityContent): ServicesData {
  return {
    heroParagraphs: sl(c, 'services.heroParagraphs'),

    serviceIntro: sl(c, 'services.serviceIntro'),

    /*
     * These slot ids (services.cards.*) are the contract Plan 3's writer schemas
     * must emit — renaming one here without updating the generator breaks builds.
     * s()/sl() throw when the builder runs (render/build time for the city
     * being rendered), so a missing slot fails that city's page or build —
     * never the whole process.
     */
    services: [
      { title: "Dusting", text: s(c, 'services.cards.dusting'), image: "/images/dusting.jpg", alt: t("home cleaning services {cityLower} {stateLower}", c), width: 401, height: 275 },
      // empty on the live site — fidelity, not an oversight (Vacuuming, Window Cleaning)
      { title: "Vacuuming", text: s(c, 'services.cards.vacuuming'), image: "/images/vacuuming.jpg", alt: "", width: 401, height: 275 },
      { title: "Bathroom Cleaning", text: s(c, 'services.cards.bathroom'), image: "/images/bathroom-cleaning.jpg", alt: t("bathroom-cleaning {cityLower}", c), width: 401, height: 275 },
      { title: "Window Cleaning", text: s(c, 'services.cards.window'), image: "/images/window.jpg", alt: "", width: 401, height: 275 },
      { title: "Upholstery Cleaning", text: s(c, 'services.cards.upholstery'), image: "/images/upholstery.jpg", alt: t("professional cleaning services {cityLower}", c), width: 401, height: 275 },
    ],
  };
}
