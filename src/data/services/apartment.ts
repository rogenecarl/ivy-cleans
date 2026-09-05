// Placeholder-grade copy, expected to be rewritten with real marketing copy.
// Structure and token placement follow src/data/deep-cleaning.ts exactly.
// whatIs.text is a plain static string and stays canonical in every city;
// whatIs.local is the one generated field (content-strategy C) and is read
// with sOpt, not s, because a city that never ran the service stage has no
// such slot and s() would throw on every one of its service pages.

import type { CityContent } from '../../content/types'
import { sOpt, serviceSlots } from '../../content/slots'
import { t } from '../../content/interpolate'
import type { ServiceContent } from '../service-types'

export function apartmentCleaningData(c: CityContent): ServiceContent {
  return {
    meta: {
      title: t("Apartment & Condo Cleaning {city}", c),
      description: t(
        "For apartment and condo cleaning built around smaller spaces and building rules in {city}, trust Ivy Cleans. Book now!",
        c
      ),
    },

    hero: {
      h1: t("Apartment & Condo Cleaning {city}", c),
      paragraphs: [
        t(
          "At Ivy Cleans, we specialize in providing apartment and condo cleaning services to renters and owners throughout {city} and the surrounding areas. We understand that apartment and condo living comes with its own layout, building rules, and shared-space considerations, so we tailor every visit to fit your unit.",
          c
        ),
        "Contact us today to book your quote.",
      ],
    },

    whatIs: {
      h2: "What is Apartment & Condo Cleaning?",
      // Break AFTER the ampersand, never before it and never inside a
      // proper noun: "What is Apartment & / Condo Cleaning?"
      h2BreakAfter: 4,
      text: "Apartment and condo cleaning is a cleaning service scaled to the way people actually live in multi unit buildings, with smaller square footage, in unit laundry closets, compact kitchens, and shared hallways or elevators to move through. It covers the same thorough cleaning of kitchens, bathrooms, floors, and living spaces as a house cleaning, adjusted for building access windows, HOA or property management guidelines, and the quieter, low odor approach that shared HVAC systems and close neighbors often call for.",
      image: "/images/deep-img1.jpg",
      local: sOpt(c, serviceSlots('apartment-cleaning')[0]),
    },

    benefitsBgImage: "/images/deep-bg4.jpg",

    benefits: {
      h2: t("Benefits of Apartment & Condo Cleaning {city}", c),
      intro: [
        "Apartment and condo cleaning is built around the realities of multi-unit living. Smaller floor plans mean every surface counts, and shared building policies mean the cleaning has to be considerate of neighbors, elevators, and posted access hours.",
        "The benefit of a service built for apartments and condos is that nothing gets overlooked simply because a unit is smaller than a house. Ivy Cleans treats every apartment and condo with the same thoroughness as a full-size home, scaled to fit the space and the building.",
      ],
      listIntro: t("There are many benefits to apartment and condo cleaning in {city}, including:", c),
      items: [
        "A cleaning routine scaled to compact kitchens, bathrooms, and living spaces",
        "Consideration for building access windows and HOA guidelines",
        "Low-odor products suited to shared ventilation systems",
        "Attention to in-unit laundry closets and balconies or patios",
        "A more comfortable, guest-ready living space",
      ],
      outro:
        "At Ivy Cleans, we use eco-friendly cleaning products and techniques to ensure that your apartment or condo is not only clean but also safe for you, your family, and your pets, and respectful of the neighbors and building staff around you.",
    },

    services: {
      h2: t("Apartment & Condo Cleaning Services {city}", c),
      image: "/images/deep-img2.jpg",
      listIntro: t("Our apartment and condo cleaning services in {city} include:", c),
      items: [
        "Thorough cleaning of kitchen counters, cabinets, and appliance exteriors",
        "Cleaning of floors, carpets, and area rugs throughout the unit",
        "Scrubbing and disinfecting of bathrooms, including toilets, sinks, and showers",
        "Dusting of surfaces, blinds, and ceiling fans",
        "Wiping down balcony or patio doors and railings",
        "Removal of trash and recycling per building guidelines",
      ],
      note: t(
        "We understand that every apartment and condo in {city} has different building rules and access requirements, which is why we coordinate scheduling around your property’s policies.",
        c
      ),
      contact: t("Contact us today to discuss your apartment or condo cleaning needs in {city}.", c),
    },

    servicesLinkHref: "",
    servicesLinkedItemIndex: -1,

    whyChoose: {
      h2: t("Why Choose Ivy Cleans for Apartment & Condo Cleaning {city}?", c),
      paragraphs: [
        t(
          "To be brief, Ivy Cleans offers the highest quality apartment and condo cleaning services in {city}. We take the time to do our work properly, effectively, and as conveniently as possible for the renter or owner. We pride ourselves in our work and the results that we have for our customers, no matter the size of the space.",
          c
        ),
        t(
          "We continually adjust our approach to fit the buildings we work in, from access procedures to shared-space etiquette. Always learning more about the properties we serve is what makes Ivy Cleans the company you should choose for apartment and condo cleaning in {city}.",
          c
        ),
      ],
      listIntro: "Here is a brief list of our best qualities:",
      qualities: [
        {
          title: "Attention to Detail",
          text: t(
            "At Ivy Cleans, we take great pride in our attention to detail regarding apartment and condo cleaning in {city}. Our experienced cleaners will leave no stone unturned in even the most compact spaces.",
            c
          ),
          icon: "/images/deep-icon1.png",
          width: 86,
          height: 86,
        },
        {
          title: "Safety",
          text: "We also understand the importance of trust and safety when it comes to allowing cleaners into your apartment or condo, which is why all of our cleaners are carefully screened, trained, and comfortable following building check-in procedures.",
          icon: "/images/deep-icon2.png",
          width: 82,
          height: 82,
        },
        {
          title: "On-time",
          text: t(
            "In addition, we are committed to arriving on time and completing our apartment and condo cleaning services within your building’s access windows. We will work with you to create a schedule that fits your needs in {city}.",
            c
          ),
          icon: "/images/deep-icon3.png",
          width: 88,
          height: 88,
        },
        {
          title: "Results",
          text: t(
            "At Ivy Cleans, we don’t consider the job done until your apartment or condo meets our standards of cleanliness in {city}. We take pride in the quality of our work and will always strive to exceed your expectations. If you are not satisfied with our services, we will work with you to make it right.",
            c
          ),
          icon: "/images/deep-icon4.png",
          width: 88,
          height: 88,
        },
      ],
      closing: t(
        "That being said, if you’re looking for exceptional apartment and condo cleaning services in {city}, look no further than Ivy Cleans. Our experience. Our dedication. Our motivation is to provide our customers with the best cleaning services in the area, no matter how compact the space. We’re different from the competition and we know it, so give us a call.",
        c
      ),
      contact:
        "Contact us today to schedule your apartment or condo cleaning appointment and experience the benefits of a cleaning service built for your building.",
    },
  };
}
