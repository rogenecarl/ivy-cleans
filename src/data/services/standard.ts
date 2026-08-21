// Placeholder-grade copy, expected to be rewritten with real marketing copy.
// Structure and token placement follow src/data/deep-cleaning.ts exactly. No
// AI slot: whatIs.text is a plain static string, not s(c, ...).

import type { CityContent } from '../../content/types'
import { t } from '../../content/interpolate'
import type { ServiceContent } from '../service-types'

export function standardCleaningData(c: CityContent): ServiceContent {
  return {
    meta: {
      title: t("Standard Cleaning {city}", c),
      description: t(
        "For reliable, recurring standard cleaning in {city}, trust Ivy Cleans. Our standard cleaning service keeps your home consistently tidy between visits. Book now!",
        c
      ),
    },

    hero: {
      h1: t("Standard Cleaning {city}", c),
      paragraphs: [
        t(
          "At Ivy Cleans, we specialize in providing dependable standard cleaning services to individuals in {city} and the surrounding areas. Whether you need a weekly, biweekly, or monthly visit, we keep your home consistently clean and comfortable so you never fall behind on the everyday upkeep.",
          c
        ),
        "Contact us today to book your quote.",
      ],
    },

    whatIs: {
      h2: "What is Standard Cleaning?",
      text: "Standard cleaning is our recurring maintenance service — the regular upkeep that keeps a home looking its best between deeper cleans. Instead of the intensive, top-to-bottom scope of a deep clean, standard cleaning focuses on the everyday spaces that get used the most: kitchens, bathrooms, living areas, and bedrooms. It’s built around a repeatable checklist so every visit delivers the same consistent, dependable results, whether it’s your first appointment or your fiftieth.",
      image: "/images/deep-img1.jpg",
    },

    benefitsBgImage: "/images/deep-bg4.jpg",

    benefits: {
      h2: t("Benefits of Standard Cleaning {city}", c),
      intro: [
        "Standard cleaning is the service most homeowners rely on week in and week out. It won’t dig into baseboards or scrub behind appliances the way a deep clean does, but it keeps the everyday surfaces of your home consistently fresh, so dust, clutter, and grime never get the chance to build up.",
        "The benefit of standard cleaning is its consistency. Because it happens on a recurring schedule, our cleaners get to know your home and your preferences, and every visit follows the same reliable routine. Ivy Cleans built our standard cleaning service around dependability, so you can count on the same quality every time.",
      ],
      listIntro: t("There are many benefits to standard cleaning your home in {city}, including:", c),
      items: [
        "Keeping your home consistently clean between visits",
        "Reducing everyday dust, dirt, and clutter buildup",
        "Saving you time on routine household chores",
        "Maintaining a tidy kitchen and bathroom week to week",
        "Creating a more relaxing, ready-for-guests living environment",
      ],
      outro:
        "At Ivy Cleans, we use eco-friendly cleaning products and techniques to ensure that your home is not only clean but also safe for you, your family, and your pets. It is important to us that you’re as comfortable as possible in your freshly cleaned home, visit after visit.",
    },

    services: {
      h2: t("Standard Cleaning Services {city}", c),
      image: "/images/deep-img2.jpg",
      listIntro: t("Our standard cleaning services in {city} include:", c),
      items: [
        "Dusting of reachable surfaces, furniture, and shelving",
        "Vacuuming carpets and rugs, and mopping hard floors",
        "Wiping down kitchen counters, tables, and appliance exteriors",
        "Cleaning and sanitizing bathroom sinks, toilets, and showers",
        "Making beds and tidying up living spaces",
        "Emptying trash and replacing liners",
      ],
      note: t(
        "We understand that every home in {city} has different upkeep needs, which is why we offer flexible standard cleaning schedules to fit your routine.",
        c
      ),
      contact: t("Contact us today to set up your standard cleaning plan in {city}.", c),
    },

    servicesLinkHref: "",
    servicesLinkedItemIndex: -1,

    whyChoose: {
      h2: t("Why Choose Ivy Cleans for Standard Cleaning {city}?", c),
      paragraphs: [
        t(
          "To be brief, Ivycleans offers the highest quality standard cleaning services in {city}. We take the time to do our work properly, effectively, and as conveniently as possible for the homeowner. We pride ourselves in our work and the results that we have for our customers. Our drive is in executing our knowledge of cleaning to best suit the needs of all of our clients on a recurring basis. That’s what differentiates us from the competition.",
          c
        ),
        t(
          "We continually refine our routines, tools, and products to find what works best for us and our customers. Always learning more and more about the industry with each passing day, is what makes Ivy Cleans the company you should choose for standard cleaning in {city}.",
          c
        ),
      ],
      listIntro: "Here is a brief list of our best qualities:",
      qualities: [
        {
          title: "Attention to Detail",
          text: t(
            "At Ivy Cleans, we take great pride in our attention to detail on every standard cleaning visit in {city}. Our cleaners follow a consistent checklist so nothing gets missed, visit after visit.",
            c
          ),
          icon: "/images/deep-icon1.png",
          width: 86,
          height: 86,
        },
        {
          title: "Safety",
          text: "We also understand the importance of trust and safety when it comes to allowing cleaners into your home on a recurring basis, which is why all of our cleaners are carefully screened and trained to handle your belongings with care.",
          icon: "/images/deep-icon2.png",
          width: 82,
          height: 82,
        },
        {
          title: "On-time",
          text: t(
            "In addition, we are committed to arriving on time for every scheduled visit and completing our standard cleaning services in a timely and efficient manner. We will work with you to build a recurring schedule that fits your routine in {city}.",
            c
          ),
          icon: "/images/deep-icon3.png",
          width: 88,
          height: 88,
        },
        {
          title: "Results",
          text: t(
            "At Ivy Cleans, we hold every standard cleaning visit to the same standard of quality in {city}. We take pride in the consistency of our work and will always strive to exceed your expectations. If you are not satisfied with our services, we will work with you to make it right.",
            c
          ),
          icon: "/images/deep-icon4.png",
          width: 88,
          height: 88,
        },
      ],
      closing: t(
        "That being said, if you’re looking for dependable, recurring standard cleaning services in {city}, look no further than Ivy Cleans. Our experience. Our dedication. Our motivation is to provide our customers with the best cleaning services in the area. We’re different from the competition and we know it, so give us a call.",
        c
      ),
      contact:
        "Contact us today to schedule your standard cleaning appointment and experience the benefits of a consistently clean home.",
    },
  };
}
