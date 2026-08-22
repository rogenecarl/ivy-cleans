// Placeholder-grade copy, expected to be rewritten with real marketing copy.
// Structure and token placement follow src/data/deep-cleaning.ts exactly. No
// AI slot: whatIs.text is a plain static string, not s(c, ...).

import type { CityContent } from '../../content/types'
import { t } from '../../content/interpolate'
import type { ServiceContent } from '../service-types'

export function postConstructionCleaningData(c: CityContent): ServiceContent {
  return {
    meta: {
      title: t("Post-Construction & Renovation Cleaning {city}", c),
      description: t(
        "For thorough dust and residue cleanup after a build or remodel in {city}, trust Ivy Cleans. Our post-construction cleaning gets your space move-in ready. Book now!",
        c
      ),
    },

    hero: {
      h1: t("Post-Construction & Renovation Cleaning {city}", c),
      paragraphs: [
        t(
          "At Ivy Cleans, we specialize in providing thorough post-construction and renovation cleaning to homeowners and contractors throughout {city} and the surrounding areas. We understand that construction dust and debris get into every corner, so we are committed to leaving your space truly move-in ready.",
          c
        ),
        "Contact us today to book your quote.",
      ],
    },

    whatIs: {
      h2: "What is Post-Construction & Renovation Cleaning?",
      // Break AFTER the ampersand, never before it and never inside a
      // proper noun: "What is Post-Construction & / Renovation Cleaning?"
      h2BreakAfter: 4,
      text: "Post-construction and renovation cleaning is a heavy-duty service for the aftermath of a build or remodel — the fine drywall dust, sawdust, and paint residue that a regular cleaning isn’t equipped to handle. It covers wiping dust from every surface, including window sills, vents, and light fixtures where it settles, scraping paint or adhesive overspray off floors and glass, vacuuming and mopping floors multiple times as dust continues to resettle, and clearing away loose trash and light packaging generated during the cleaning itself.",
      image: "/images/deep-img1.jpg",
    },

    benefitsBgImage: "/images/deep-bg4.jpg",

    benefits: {
      h2: t("Benefits of Post-Construction & Renovation Cleaning {city}", c),
      intro: [
        "Post-construction cleaning is one of the most intensive services we offer. Fine dust from drywall and sawdust settles into places a regular cleaning never touches, and it often takes more than one pass to fully clear it out.",
        "The benefit of post-construction cleaning is that it turns a job site back into a livable space. Ivy Cleans handles the dust and residue left behind by contractors so you don’t have to spend weeks discovering it room by room.",
      ],
      listIntro: t("There are many benefits to post-construction cleaning your space in {city}, including:", c),
      items: [
        "Removing fine drywall dust from surfaces, accessible vent covers, and light fixtures",
        "Clearing sawdust and fine dust from floors and corners",
        "Scraping paint, adhesive, or overspray off floors and windows",
        "Improving indoor air quality after a build or remodel",
        "Getting the space genuinely ready for move-in or occupancy",
      ],
      outro:
        "At Ivy Cleans, we use eco-friendly cleaning products and techniques suited to construction dust and residue, so your newly built or renovated space is left clean, comfortable, and ready to enjoy.",
    },

    services: {
      h2: t("Post-Construction & Renovation Cleaning Services {city}", c),
      image: "/images/deep-img2.jpg",
      listIntro: t("Our post-construction and renovation cleaning services in {city} include:", c),
      items: [
        "Dusting and wiping down all surfaces, including window sills and vents",
        "Removing paint splatter, adhesive residue, and stickers from floors and glass",
        "Vacuuming and mopping floors to clear settled dust and debris",
        "Cleaning windows, mirrors, and fixtures streak-free",
        "Wiping down cabinets, countertops, and appliances inside and out",
        "Removing loose trash and light packaging generated during the cleaning",
      ],
      note: t(
        "We understand that every build or remodel in {city} leaves behind a different mix of dust and debris, which is why we tailor our post-construction cleaning to your project.",
        c
      ),
      contact: t("Contact us today to schedule your post-construction cleaning in {city}.", c),
    },

    servicesLinkHref: "",
    servicesLinkedItemIndex: -1,

    whyChoose: {
      h2: t("Why Choose Ivy Cleans for Post-Construction & Renovation Cleaning {city}?", c),
      paragraphs: [
        t(
          "To be brief, Ivy Cleans offers the highest quality post-construction cleaning services in {city}. We take the time to do our work properly, effectively, and as thoroughly as a job site deserves. We pride ourselves in working through a space pass after pass until the construction dust and residue our customers are left with have been cleared.",
          c
        ),
        t(
          "We continually refine our approach to construction dust and residue as building materials and finishes change. Always learning more about what a job site leaves behind is what makes Ivy Cleans the company you should choose for post-construction cleaning in {city}.",
          c
        ),
      ],
      listIntro: "Here is a brief list of our best qualities:",
      qualities: [
        {
          title: "Attention to Detail",
          text: t(
            "At Ivy Cleans, we take great pride in our attention to detail regarding post-construction cleaning in {city}. Our experienced cleaners chase down dust in every corner, vent, and fixture until the space is truly finished.",
            c
          ),
          icon: "/images/deep-icon1.png",
          width: 86,
          height: 86,
        },
        {
          title: "Safety",
          text: "We also understand the importance of trust and safety when it comes to allowing cleaners into a freshly built or renovated space, which is why all of our cleaners are carefully screened and trained to work respectfully around your property.",
          icon: "/images/deep-icon2.png",
          width: 82,
          height: 82,
        },
        {
          title: "On-time",
          text: t(
            "In addition, we are committed to arriving on time and completing our post-construction cleaning services in a timely and efficient manner. We will work with you and your contractor to schedule around your project timeline in {city}.",
            c
          ),
          icon: "/images/deep-icon3.png",
          width: 88,
          height: 88,
        },
        {
          title: "Results",
          text: t(
            "At Ivy Cleans, we don’t hand back the space until it meets our standards of post-construction cleaning in {city}. We take pride in the quality of our work and will always strive to exceed your expectations. If you are not satisfied with our services, we will work with you to make it right.",
            c
          ),
          icon: "/images/deep-icon4.png",
          width: 88,
          height: 88,
        },
      ],
      closing: t(
        "That being said, if you’re looking for thorough post-construction and renovation cleaning services in {city}, look no further than Ivy Cleans. Our experience. Our dedication. Our motivation is to turn a job site back into a livable space for our customers. We’re different from the competition and we know it, so give us a call.",
        c
      ),
      contact:
        "Contact us today to schedule your post-construction cleaning appointment and experience the benefits of a truly move-in ready space.",
    },
  };
}
