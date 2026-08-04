// Verbatim copy from docs/superpowers/reference/ivycleans-live/deep-cleaning-content-dump.txt
// (lines 32-95) and deep-cleaning.html (meta description). Typos and lowercase
// "cleans" mid-sentence are preserved exactly as on the live site.
//
// IMPORTANT: dump lines 42-43 are an injected spam paragraph (Vavada Casino /
// beadspinnerstore.com / Cyrillic text) that must never be reproduced here.
// The Benefits `intro` below skips straight from the line-41 paragraph to the
// line-44 `listIntro`.

export const deepMeta = {
  title: "Deep Clean Minneapolis",
  description:
    "For a deep clean that revitalizes your Minneapolis home, trust Ivy Cleans. Our deep cleaning service ensures a thorough sparkle. Book now!",
};

export const deepHero: { h1: string; paragraphs: string[] } = {
  h1: "Deep Cleaning Minneapolis",
  paragraphs: [
    "At Ivy Cleans, we specialize in providing exceptional deep cleaning services to individuals in Minneapolis and the surrounding areas. We understand the importance of a clean and comfortable living environment, so we are committed to providing top-notch cleaning services that meet your needs.",
    "Contact us today to book your quote.",
  ],
};

export const whatIs: { h2: string; text: string; image: string } = {
  h2: "What is Deep House Cleaning?",
  text: "Deep cleaning is a comprehensive cleaning service that goes beyond regular cleaning tasks. It involves a thorough cleaning of all surfaces, floors, carpets, and furniture in your home, with the goal of removing dirt, dust, and other allergens that may be lurking in your home. By doing so, deep cleaning helps to create a healthier and more comfortable living environment for you and your family.",
  image: "/images/deep-img1.jpg",
};

// Right-column background image in the Benefits section (elementor-element-2c321bb,
// deep-bg4.jpg). Not part of the `benefits` object per the task-2 interface, kept as
// its own export since it's presentational rather than copy.
export const benefitsBgImage = "/images/deep-bg4.jpg";

export const benefits: {
  h2: string;
  intro: string[];
  listIntro: string;
  items: string[];
  outro: string;
} = {
  h2: "Benefits of Deep Cleaning Minneapolis",
  intro: [
    "Deep cleaning is the most intensive cleaning service available. When you request these services you can assure yourself not only of the quality you’re going to receive but also of the depth of the services. We make sure that your home is ready to turn into a landlord, incoming homeowner, or current homeowner.",
    "The benefits of deep cleaning really come in because the service is so comprehensive. Areas that aren’t typically cleaned are covered, wiped down, and sanitized. Ivy cleans specializes in improving the cleanliness of clients’ homes that’s why we offer deep cleaning. To offer the most comprehensive service available, making sure that there isn’t a single box we leave unchecked.",
  ],
  listIntro: "There are many benefits to deep cleaning your home in Minneapolis, including:",
  items: [
    "Reducing the number of allergens in your home",
    "Improving indoor air quality",
    "Preventing the spread of germs and bacteria",
    "Removing stubborn stains and dirt buildup",
    "Creating a more comfortable living environment",
  ],
  outro:
    "At Ivy Cleans, we use eco-friendly cleaning products and techniques to ensure that your home is not only clean but also safe for you, your family, and your pets. It is important to us that you’re as comfortable as possible in your freshly cleaned home.",
};

export const deepServices: {
  h2: string;
  image: string;
  listIntro: string;
  items: string[];
  note: string;
  contact: string;
} = {
  h2: "Deep Cleaning Services Minneapolis",
  image: "/images/deep-img2.jpg",
  listIntro: "Our deep cleaning services in Minneapolis include:",
  items: [
    "Thorough cleaning of all surfaces, including countertops, cabinets, and furniture",
    "Cleaning of floors, carpets, and rugs",
    "Scrubbing and disinfecting of bathrooms, including toilets, sinks, and showers",
    "Cleaning and disinfecting of kitchen appliances, including stoves, ovens, and refrigerators",
    "Dusting and cleaning of all surfaces, including baseboards, light fixtures, and ceiling fans",
    "Removal of trash and recycling",
  ],
  note: "We understand that every home in Minneapolis is unique, which is why we offer customized cleaning services to meet your specific needs.",
  contact: "Contact us today to discuss your deep cleaning requirements in Minneapolis.",
};

/*
 * Elementor quirk on the live page: the <a href="https://ivycleans.com/how-to-clean-a-bathroom/">
 * anchor (dump line 67, elementor-element-c1f51fd markup) does NOT wrap the bathroom
 * list item's text — it wraps the ENTIRE next <li> ("Cleaning and disinfecting of
 * kitchen appliances, including stoves, ovens, and refrigerators", deepServices.items[3]),
 * icon included. Reproduced as-is in DeepServices.tsx rather than "corrected."
 */
export const deepServicesLinkHref = "https://ivycleans.com/how-to-clean-a-bathroom/";
export const deepServicesLinkedItemIndex = 3;

export type DeepQuality = { title: string; text: string; icon: string; width: number; height: number };

export const whyChoose: {
  h2: string;
  paragraphs: string[];
  listIntro: string;
  qualities: DeepQuality[];
  closing: string;
  contact: string;
} = {
  h2: "Why Choose Ivy Cleans for Deep Cleaning Minneapolis?",
  paragraphs: [
    "To be brief, Ivycleans offers the highest quality cleaning services in Minneapolis. We take the time to do our work properly, effectively, and as conveniently as possible for the homeowner. We pride ourselves in our work and the results that we have for our customers. Our drive is in executing our knowledge of cleaning to best suit the needs of all of our clients. That’s what differentiates us from the competition. We truly care about the services we provide, making sure that they are the best they can be.",
    "We continually change our techniques, tools, and products to find what works best for us and our customers. Always learning more and more about the industry with each passing day, is what makes Ivy cleans the only company in Minneapolis the company you should choose for deep cleaning.",
  ],
  listIntro: "Here is a brief list of our best qualities:",
  qualities: [
    {
      title: "Attention to Detail",
      text: "At Ivy Cleans, we take great pride in our attention to detail regarding deep cleaning in Minneapolis. Our experienced cleaners will leave no stone unturned in our quest to make your home as clean and comfortable as possible.",
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
      text: "In addition, we are committed to arriving on time and completing our deep cleaning services in a timely and efficient manner. We will work with you to create a cleaning schedule that fits your needs and preferences in Minneapolis.",
      icon: "/images/deep-icon3.png",
      width: 88,
      height: 88,
    },
    {
      title: "Results",
      text: "At Ivy Cleans, we don’t turn in the house until it meets our standards of deep cleaning in Minneapolis. We take pride in the quality of our work and will always strive to exceed your expectations. If you are not satisfied with our services, we will work with you to make it right.",
      icon: "/images/deep-icon4.png",
      width: 88,
      height: 88,
    },
  ],
  closing:
    "That being said, if you’re looking for exceptional deep cleaning services in Minneapolis, look no further than Ivy Cleans. Our experience. Our dedication. Our motivation is to provide our customers with the best cleaning services in the area. We’re different from the competition and we know it, so give us a call.",
  contact:
    "Contact us today to schedule your deep cleaning appointment and experience the benefits of deep cleaning.",
};
