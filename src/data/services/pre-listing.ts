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

export function preListingCleaningData(c: CityContent): ServiceContent {
  return {
    meta: {
      title: t("Real Estate & Pre-Listing Cleaning {city}", c),
      description: t(
        "For a home that shows its best from the first showing in {city}, trust Ivy Cleans. Our real estate and pre-listing cleaning gets homes photo- and buyer-ready. Book now!",
        c
      ),
    },

    hero: {
      h1: t("Real Estate & Pre-Listing Cleaning {city}", c),
      paragraphs: [
        t(
          "At Ivy Cleans, we specialize in providing real estate and pre-listing cleaning services to homeowners, sellers, and agents throughout {city} and the surrounding areas. We understand that a home only gets one chance to make a first impression on a buyer, so we make sure it shows at its best.",
          c
        ),
        "Contact us today to book your quote.",
      ],
    },

    whatIs: {
      h2: "What is Real Estate & Pre-Listing Cleaning?",
      // Break AFTER the ampersand, never before it and never inside a
      // proper noun: "What is Real Estate & / Pre-Listing Cleaning?"
      h2BreakAfter: 5,
      text: "Real estate and pre listing cleaning is a detailed service that prepares a home for photos, showings, and open houses. Buyers form an impression within the first few minutes of a walk through, so this service targets streak free windows and mirrors, spotless kitchens and bathrooms, decluttered and wiped down surfaces, and fresh smelling, well presented rooms. These are the details that photograph well and hold up under a buyer’s close look, timed around your agent’s listing and showing schedule.",
      image: "/images/deep-img1.jpg",
      local: sOpt(c, serviceSlots('pre-listing-cleaning')[0]),
    },

    benefitsBgImage: "/images/deep-bg4.jpg",

    benefits: {
      h2: t("Benefits of Real Estate & Pre-Listing Cleaning {city}", c),
      intro: [
        "Pre listing cleaning is timed around a deadline most cleaning services do not have to think about, which is your listing photos and first showing. Every surface has to hold up not just to a walk through, but to a camera lens.",
        "The benefit of pre-listing cleaning is that it removes one more variable from a stressful process. Ivy Cleans works around your agent’s timeline so the home is ready exactly when the listing goes live.",
      ],
      listIntro: t("There are many benefits to real estate and pre-listing cleaning in {city}, including:", c),
      items: [
        "Making a stronger first impression on buyers and their agents",
        "Photo-ready rooms with streak-free windows and mirrors",
        "Spotless kitchens and bathrooms, the two rooms buyers scrutinize most",
        "Decluttered, wiped-down surfaces that support your agent’s staging",
        "A home that’s ready on your listing timeline, not after it",
      ],
      outro:
        "At Ivy Cleans, we use eco-friendly cleaning products and techniques to make sure your home is not only camera-ready but safe and comfortable for every buyer who walks through the door.",
    },

    services: {
      h2: t("Real Estate & Pre-Listing Cleaning Services {city}", c),
      image: "/images/deep-img2.jpg",
      listIntro: t("Our real estate and pre-listing cleaning services in {city} include:", c),
      items: [
        "Streak-free cleaning of windows, mirrors, and glass surfaces",
        "Scrubbing and disinfecting bathrooms, including toilets, sinks, and showers",
        "Thorough cleaning of kitchen counters, cabinets, and appliances",
        "Vacuuming carpets and mopping hard floors throughout the home",
        "Dusting reachable ledges, shelves, and trim throughout the home",
        "Tidying and wiping down surfaces to support staging and photos",
      ],
      note: t(
        "We understand that every listing in {city} runs on its agent’s timeline, which is why we schedule around your photo shoot and showing dates.",
        c
      ),
      contact: t("Contact us today to schedule your pre-listing cleaning in {city}.", c),
    },

    servicesLinkHref: "",
    servicesLinkedItemIndex: -1,

    whyChoose: {
      h2: t("Why Choose Ivy Cleans for Real Estate & Pre-Listing Cleaning {city}?", c),
      paragraphs: [
        t(
          "To be brief, Ivy Cleans offers the highest quality pre-listing cleaning services in {city}. We take the time to do our work properly, effectively, and as conveniently as possible ahead of your listing date. We pride ourselves in helping homes show at their best.",
          c
        ),
        t(
          "We continually refine our approach to what buyers and agents notice first. Always learning more about what makes a listing stand out is what makes Ivy Cleans the company you should choose for pre-listing cleaning in {city}.",
          c
        ),
      ],
      listIntro: "Here is a brief list of our best qualities:",
      qualities: [
        {
          title: "Attention to Detail",
          text: t(
            "At Ivy Cleans, we take great pride in our attention to detail regarding pre-listing cleaning in {city}. Our experienced cleaners catch the small things a buyer will notice, from smudged switch plates to streaked windows.",
            c
          ),
          icon: "/images/deep-icon1.png",
          width: 86,
          height: 86,
        },
        {
          title: "Safety",
          text: "We also understand the importance of trust and safety when it comes to allowing cleaners into a home that’s about to be shown to the public, which is why all of our cleaners are carefully screened and trained to handle your belongings with care.",
          icon: "/images/deep-icon2.png",
          width: 82,
          height: 82,
        },
        {
          title: "On-time",
          text: t(
            "In addition, we are committed to arriving on time and completing our pre-listing cleaning services ahead of your photo shoot or first showing. We will work with you and your agent to hit your listing timeline in {city}.",
            c
          ),
          icon: "/images/deep-icon3.png",
          width: 88,
          height: 88,
        },
        {
          title: "Results",
          text: t(
            "At Ivy Cleans, we don’t consider a listing ready until it meets our standards of pre-listing cleanliness in {city}. We take pride in the quality of our work and will always strive to help your home make the best first impression. If you are not satisfied with our services, we will work with you to make it right.",
            c
          ),
          icon: "/images/deep-icon4.png",
          width: 88,
          height: 88,
        },
      ],
      closing: t(
        "That being said, if you’re looking for exceptional real estate and pre-listing cleaning services in {city}, look no further than Ivy Cleans. Our experience. Our dedication. Our motivation is to help your home show at its best for every buyer who walks through the door. We’re different from the competition and we know it, so give us a call.",
        c
      ),
      contact:
        "Contact us today to schedule your pre-listing cleaning appointment and experience the benefits of a home that’s ready to sell.",
    },
  };
}
