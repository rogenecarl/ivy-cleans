// Placeholder-grade copy, expected to be rewritten with real marketing copy.
// Structure and token placement follow src/data/deep-cleaning.ts exactly. No
// AI slot: whatIs.text is a plain static string, not s(c, ...).

import type { CityContent } from '../../content/types'
import { t } from '../../content/interpolate'
import type { ServiceContent } from '../service-types'

export function airbnbCleaningData(c: CityContent): ServiceContent {
  return {
    meta: {
      title: t("Airbnb & Short-Term Rental Cleaning {city}", c),
      description: t(
        "For fast, reliable turnover cleaning between guests in {city}, trust Ivy Cleans. Our Airbnb and short-term rental cleaning keeps your listing guest-ready. Book now!",
        c
      ),
    },

    hero: {
      h1: t("Airbnb & Short-Term Rental Cleaning {city}", c),
      paragraphs: [
        t(
          "At Ivy Cleans, we specialize in providing dependable turnover cleaning for Airbnb and short-term rental hosts throughout {city} and the surrounding areas. We understand that a guest-ready listing on a tight turnaround is what keeps your reviews high and your calendar booked.",
          c
        ),
        "Contact us today to book your quote.",
      ],
    },

    whatIs: {
      h2: "What is Airbnb & Short-Term Rental Cleaning?",
      // Break AFTER the ampersand, never before it and never inside a
      // proper noun: "What is Airbnb & / Short-Term Rental Cleaning?"
      h2BreakAfter: 4,
      text: "Airbnb and short term rental cleaning is a turnover service built around the gap between one guest checking out and the next checking in. It goes beyond a standard tidy up. Beds are stripped and remade with fresh linens, bathrooms and kitchens are reset to a hotel-level standard, host-provided amenities like toiletries, coffee, and paper products are checked and restocked, and every room is inspected against a consistent checklist so the space looks exactly as advertised for the next guest.",
      image: "/images/deep-img1.jpg",
    },

    benefitsBgImage: "/images/deep-bg4.jpg",

    benefits: {
      h2: t("Benefits of Airbnb & Short-Term Rental Cleaning {city}", c),
      intro: [
        "Turnover cleaning runs on a different clock than a typical house cleaning, often just a few hours between one guest leaving and the next arriving. Every visit has to be quick, consistent, and thorough enough to hold up to guest reviews.",
        "The benefit of a dedicated turnover service is reliability. Ivy Cleans works from a repeatable checklist for every stay, so your listing meets the same guest-ready standard whether it’s a first booking or your hundredth.",
      ],
      listIntro: t("There are many benefits to Airbnb and short-term rental cleaning in {city}, including:", c),
      items: [
        "Faster turnaround between checkout and the next check-in",
        "Consistent guest-ready presentation that supports strong reviews",
        "Beds stripped and made up with the fresh linens and towels you stock",
        "Restocked host amenities like toiletries, coffee, and paper products",
        "A reliable partner who can work around your booking calendar",
      ],
      outro:
        "At Ivy Cleans, we use eco-friendly cleaning products and techniques to ensure that your rental is not only clean but also safe and welcoming for every guest who walks through the door.",
    },

    services: {
      h2: t("Airbnb & Short-Term Rental Cleaning Services {city}", c),
      image: "/images/deep-img2.jpg",
      listIntro: t("Our Airbnb and short-term rental turnover services in {city} include:", c),
      items: [
        "Stripping beds and making them up with the clean linens and towels you provide",
        "Resetting and sanitizing kitchens, including dishes, counters, and appliances",
        "Scrubbing and disinfecting bathrooms, including toilets, sinks, and showers",
        "Restocking host-provided amenities and checking supply levels",
        "Straightening furniture, decor, and staged items to match listing photos",
        "Removing trash and preparing the unit for the next guest arrival",
      ],
      note: t(
        "We understand that every listing in {city} runs on its own booking calendar, which is why we offer flexible turnover scheduling to match your check-in and checkout times.",
        c
      ),
      contact: t("Contact us today to set up recurring turnover cleaning for your {city} listing.", c),
    },

    servicesLinkHref: "",
    servicesLinkedItemIndex: -1,

    whyChoose: {
      h2: t("Why Choose Ivy Cleans for Airbnb & Short-Term Rental Cleaning {city}?", c),
      paragraphs: [
        t(
          "To be brief, Ivy Cleans offers the highest quality turnover cleaning services in {city}. We take the time to do our work properly, effectively, and as quickly as your booking calendar demands. We pride ourselves in our work and the results that we have for our host customers.",
          c
        ),
        t(
          "We continually refine our turnover checklist to keep pace with what guests expect from a short-term rental. Always learning more about hosting standards is what makes Ivy Cleans the company you should choose for Airbnb cleaning in {city}.",
          c
        ),
      ],
      listIntro: "Here is a brief list of our best qualities:",
      qualities: [
        {
          title: "Attention to Detail",
          text: t(
            "At Ivy Cleans, we take great pride in our attention to detail on every turnover in {city}. Our cleaners work from a consistent checklist so your listing always matches its photos.",
            c
          ),
          icon: "/images/deep-icon1.png",
          width: 86,
          height: 86,
        },
        {
          title: "Safety",
          text: "We also understand the importance of trust and safety when it comes to giving cleaners access to your rental between guests, which is why all of our cleaners are carefully screened and trained to handle your property with care.",
          icon: "/images/deep-icon2.png",
          width: 82,
          height: 82,
        },
        {
          title: "On-time",
          text: t(
            "In addition, we plan our turnover visits around your check-in and checkout times and keep you updated on when our cleaners will arrive. We will work with you to build a schedule that matches your booking calendar in {city}.",
            c
          ),
          icon: "/images/deep-icon3.png",
          width: 88,
          height: 88,
        },
        {
          title: "Results",
          text: t(
            "At Ivy Cleans, we don’t consider a turnover done until it meets our guest-ready standard in {city}. We take pride in the quality of our work and hold every visit to the same guest-ready standard. If you are not satisfied with our services, we will work with you to make it right.",
            c
          ),
          icon: "/images/deep-icon4.png",
          width: 88,
          height: 88,
        },
      ],
      closing: t(
        "That being said, if you’re looking for dependable Airbnb and short-term rental turnover cleaning in {city}, look no further than Ivy Cleans. Our experience. Our dedication. Our motivation is to help your listing earn great reviews, visit after visit. We’re different from the competition and we know it, so give us a call.",
        c
      ),
      contact:
        "Contact us today to schedule your turnover cleaning and experience the benefits of a guest-ready listing.",
    },
  };
}
