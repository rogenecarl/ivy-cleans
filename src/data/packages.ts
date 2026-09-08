import type { CityContent } from '../content/types'
import { cityHref, t } from '../content/interpolate'
import { serviceBySlug, type ServiceSlug } from './services/registry'

export type Pkg = { title: string; text: string; icon: string; href: string };

// Exactly the seven registered services, titled as the registry names them and linked to their pages.
function card(slug: ServiceSlug, text: string, icon: string, c: CityContent): Pkg {
  const entry = serviceBySlug(slug)
  if (entry === undefined) throw new Error(`packages: "${slug}" is not a registered service`)
  return { title: entry.name, text, icon, href: cityHref(c, `/services/${slug}`) }
}

export type PackagesData = {
  packagesIntro: string;
  packages: Pkg[];
};

export function packagesData(c: CityContent): PackagesData {
  return {
    packagesIntro:
      t("Under this section, we provide different types of cleaning services in {city}. Our services include residential cleaning, commercial cleaning, office cleaning, and more. Our team of professional cleaners is experienced in handling any type of cleaning job, no matter how big or small. We use high-quality cleaning products and equipment to ensure the best possible results for our clients. Our team is also flexible, and we work around our client’s schedules to provide cleaning services at a time that is convenient for them.", c),

    packages: [
      card("standard-cleaning", "Maintaining frequently used sections of your household ensures a worry-free living experience. Choose between scheduling one-time, bi-weekly, or monthly services!", "/images/icon1.png", c),
      card("deep-cleaning", "A comprehensive sanitation of your residence, encompassing inaccessible regions such as beneath furniture and appliances, as well as baseboards and window sills.", "/images/icon6.png", c),
      card("move-in-move-out-cleaning", "A comprehensive cleaning service that covers all areas of the home, from top to bottom, including activities such as dusting, vacuuming, and disinfecting surfaces in order to ready the residence for its new occupants.", "/images/icon2.png", c),
      card("apartment-cleaning", "Efficient and comprehensive cleaning service designed specifically for condominiums, ensuring every room is meticulously cleaned, from living areas to bedrooms and kitchens.", "/images/icon7.png", c),
      card("airbnb-cleaning", "A specialized cleaning service designed specifically for the maintenance of temporary accommodations, which includes tasks such as handling laundry, restocking supplies, and guaranteeing excellent guest reviews.", "/images/icon3.png", c),
      card("post-construction-cleaning", "A cleaning process that entails the elimination of dust, debris, and other construction materials following a renovation or construction endeavor.", "/images/icon4.png", c),
      card("pre-listing-cleaning", "A detailed cleaning that prepares a home for photos, showings, and open houses, so that it makes its best first impression on buyers from the very first walk-through.", "/images/icon8.png", c),
    ],
  };
}
