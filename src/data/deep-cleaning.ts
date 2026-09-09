// Verbatim from deep-cleaning-content-dump.txt (lines 32-95) and deep-cleaning.html. Dump lines 42-43 are injected spam — never reproduce.
// {city}/{state} tokens where Minneapolis/MN appeared; whatIs.local is the one generated slot.

import type { CityContent } from '../content/types'
import { sOpt, serviceSlots } from '../content/slots'
import { slotLinks } from '../content/links'
import { t } from '../content/interpolate'
import type { ServiceContent } from './service-types'

export function deepCleaningData(c: CityContent): ServiceContent {
  return {
    meta: {
      title: t("Deep Clean {city}", c),
      description: t(
        "For a deep clean that revitalizes your {city} home, trust Ivy Cleans. Our deep cleaning service ensures a thorough sparkle. Book now!",
        c
      ),
    },

    hero: {
      h1: t("Deep Cleaning {city}", c),
      paragraphs: [
        t(
          "At Ivy Cleans, we specialize in providing exceptional deep cleaning services to individuals in {city} and the surrounding areas. We understand the importance of a clean and comfortable living environment, so we are committed to providing top-notch cleaning services that meet your needs.",
          c
        ),
        "Contact us today to book your quote.",
      ],
    },

    whatIs: {
      h2: "What is Deep House Cleaning?",
      // static and canonical in every city; the per-city part is whatIs.local
      text: "A deep clean is the visit that gets to everything a regular clean walks past. We pull out what moves and clean behind it, wipe down baseboards, door frames, switch plates and the tops of cabinets, scrub the grout, degrease the range hood and the inside of the oven, and get the buildup off shower glass and around the taps. Vents and ceiling fans get dusted, and blinds and window tracks get done rather than skipped. It takes longer than a standard visit because it’s doing the work a standard visit isn’t for: the dirt that has settled in over months, not the week’s mess.",
      image: "/images/deep-img1.jpg",
      local: sOpt(c, serviceSlots('deep-cleaning')[0]),
      localLinks: slotLinks(c, serviceSlots('deep-cleaning')[0]),
    },

    // Benefits right-column image (2c321bb)
    benefitsBgImage: "/images/deep-bg4.jpg",

    benefits: {
      h2: t("Benefits of Deep Cleaning {city}", c),
      intro: [
        "Deep cleaning is the most intensive cleaning service available. When you request these services you can assure yourself not only of the quality you’re going to receive but also of the depth of the services. We make sure that your home is ready to turn into a landlord, incoming homeowner, or current homeowner.",
        "The benefits of deep cleaning really come in because the service is so comprehensive. Areas that aren’t typically cleaned are covered, wiped down, and sanitized. Ivy cleans specializes in improving the cleanliness of clients’ homes that’s why we offer deep cleaning. To offer the most comprehensive service available, making sure that there isn’t a single box we leave unchecked.",
      ],
      listIntro: t("There are many benefits to deep cleaning your home in {city}, including:", c),
      items: [
        "Reducing the number of allergens in your home",
        "Improving indoor air quality",
        "Preventing the spread of germs and bacteria",
        "Removing stubborn stains and dirt buildup",
        "Creating a more comfortable living environment",
      ],
      outro:
        "At Ivy Cleans, we use eco-friendly cleaning products and techniques to ensure that your home is not only clean but also safe for you, your family, and your pets. It is important to us that you’re as comfortable as possible in your freshly cleaned home.",
    },

    services: {
      h2: t("Deep Cleaning Services {city}", c),
      image: "/images/deep-img2.jpg",
      listIntro: t("Our deep cleaning services in {city} include:", c),
      items: [
        "Thorough cleaning of all surfaces, including countertops, cabinets, and furniture",
        "Cleaning of floors, carpets, and rugs",
        "Scrubbing and disinfecting of bathrooms, including toilets, sinks, and showers",
        "Cleaning and disinfecting of kitchen appliances, including stoves, ovens, and refrigerators",
        "Dusting and cleaning of all surfaces, including baseboards, light fixtures, and ceiling fans",
        "Removal of trash and recycling",
      ],
      note: t(
        "We understand that every home in {city} is unique, which is why we offer customized cleaning services to meet your specific needs.",
        c
      ),
      contact: t("Contact us today to discuss your deep cleaning requirements in {city}.", c),
    },

    // live linked one item to an ivycleans.com post no tenant serves; unlinked (no link may leave the tenant)
    servicesLinkHref: "",
    servicesLinkedItemIndex: -1,

    whyChoose: {
      h2: t("Why Choose Ivy Cleans for Deep Cleaning {city}?", c),
      paragraphs: [
        t(
          "To be brief, Ivycleans offers the highest quality cleaning services in {city}. We take the time to do our work properly, effectively, and as conveniently as possible for the homeowner. We pride ourselves in our work and the results that we have for our customers. Our drive is in executing our knowledge of cleaning to best suit the needs of all of our clients. That’s what differentiates us from the competition. We truly care about the services we provide, making sure that they are the best they can be.",
          c
        ),
        t(
          "We continually change our techniques, tools, and products to find what works best for us and our customers. Always learning more and more about the industry with each passing day, is what makes Ivy cleans the only company in {city} the company you should choose for deep cleaning.",
          c
        ),
      ],
      listIntro: "Here is a brief list of our best qualities:",
      qualities: [
        {
          title: "Attention to Detail",
          text: t(
            "At Ivy Cleans, we take great pride in our attention to detail regarding deep cleaning in {city}. Our experienced cleaners will leave no stone unturned in our quest to make your home as clean and comfortable as possible.",
            c
          ),
          icon: "/images/deep-icon1.png",
          width: 86,
          height: 86,
        },
        {
          title: "Safety",
          text: "We also understand the importance of trust and safety when it comes to allowing cleaners into your home, which is why all of our cleaners are carefully screened and trained to handle your belongings with care.",
          icon: "/images/deep-icon2.png",
          width: 82,
          height: 82,
        },
        {
          title: "On-time",
          text: t(
            "In addition, we are committed to arriving on time and completing our deep cleaning services in a timely and efficient manner. We will work with you to create a cleaning schedule that fits your needs and preferences in {city}.",
            c
          ),
          icon: "/images/deep-icon3.png",
          width: 88,
          height: 88,
        },
        {
          title: "Results",
          text: t(
            "At Ivy Cleans, we don’t turn in the house until it meets our standards of deep cleaning in {city}. We take pride in the quality of our work and will always strive to exceed your expectations. If you are not satisfied with our services, we will work with you to make it right.",
            c
          ),
          icon: "/images/deep-icon4.png",
          width: 88,
          height: 88,
        },
      ],
      closing: t(
        "That being said, if you’re looking for exceptional deep cleaning services in {city}, look no further than Ivy Cleans. Our experience. Our dedication. Our motivation is to provide our customers with the best cleaning services in the area. We’re different from the competition and we know it, so give us a call.",
        c
      ),
      contact:
        "Contact us today to schedule your deep cleaning appointment and experience the benefits of deep cleaning.",
    },
  };
}
