// src/data/home.ts
import type { CityContent } from '../content/types'
import { s } from '../content/slots'
import { t } from '../content/interpolate'

export type Feature = { title: string; text: string; icon: string; width: number; height: number };

export type HomeData = {
  homeMeta: { title: string; description: string };
  nearMe: string[];
  features: Feature[];
  featuresOutro: string;
  houseCleaning: string[];
  principles: string[];
  zipParagraph: string;
  landmarksParagraph: string;
  workImages: string[];
};

/*
 * CITY-class copy: whole paragraphs are the live site's copy verbatim, with
 * only the {city}/{state} tokens inserted where "Minneapolis"/"MN" appeared.
 * Strings without a city mention are intentionally left un-wrapped literals.
 */
export function homeData(c: CityContent): HomeData {
  return {
    homeMeta: {
      title: t("Cleaning Service in {city}, {state} | Ivy Cleans", c),
      description:
        "Ivy Cleans is a great choice for all of your home cleaning needs. We offer a 100% satisfaction on all of our cleans. Check us out today!",
    },

    nearMe: [
      t(
        "At Ivy Cleans, our passion is providing high-quality house cleaning services in {city}. We are a team of professional adults, dedicated to excellence, who act as much more than just maids. We understand the importance of trust and reliability – factors that are highlighted in our positive customer reviews. We are the perfect choice for anyone looking for a reliable, professional, and trustworthy house cleaning service in {city}.",
        c
      ),
      t(
        "That being said, if you’re interested in top-tier cleaning services in {city}, don’t hesitate to let us know. We would love to make sure that your house gets the attention it deserves because those are the values that have been instilled in our company since our inception.",
        c
      ),
    ],

    features: [
      { title: "Attention to Detail", text: "At Ivy Cleans, we understand that every house is unique and requires personalize attention. Our team takes the time to get to know each client and their specific cleaning needs. We pay close attention to detail and ensure that every nook and cranny is thoroughly cleaned.", icon: "/images/service-icon1.png", width: 86, height: 86 },
      { title: "Eco-Friendly Cleaning Products", text: "We are committed to using eco-friendly cleaning products that are safe for your family and pets, as well as the environment. Our products are effective in cleaning and disinfecting your home without leaving behind any harmful residues.", icon: "/images/service-icon2.png", width: 87, height: 87 },
      { title: "Highly-Trained and Professional Staff", text: "Our cleaning staff or cleaner is highly trained and experienced. We carefully select our team members and ensure that they share our values of professionalism, honesty, and attention to detail. You can trust that our staff will treat your home with the utmost care and respect.", icon: "/images/service-icon3.png", width: 87, height: 87 },
      { title: "Customizable Cleaning Plans", text: "We offer customizable cleaning plans to meet the unique needs of each client. Whether you need weekly, bi-weekly, or monthly cleaning services, we can tailor our services to fit your schedule and budget.", icon: "/images/service-icon4.png", width: 87, height: 87 },
      { title: "Affordable Pricing", text: "We understand that affordability is important to our clients. That’s why we offer competitive pricing without sacrificing the quality of our services. Satisfaction Guarantee: We stand behind the quality of our work and offer a satisfaction guarantee. If you’re not completely satisfied with our cleaning services, we will work with you to make it right.", icon: "/images/service-icon5.png", width: 85, height: 87 },
    ],

    featuresOutro: t(
      "Ivy Cleans is committed to providing exceptional cleaning services in {city} throughout homes, apartments and offices. Our services are personalized, eco-friendly, and affordable. Our highly-trained staff takes pride in their work and always goes the extra mile to ensure that your home is thoroughly cleaned and disinfected.",
      c
    ),

    houseCleaning: [
      t(
        "At Ivy Cleans, our passion for providing high-quality house cleaning services in {city} is unmatched. Our team prides itself on professionalism, and we prioritize the trust and reliability which come with inviting cleaning professionals into your home. As a reliable, professional, and trustworthy house cleaning service in {city}, we are the clear choice for anyone seeking top-notch service.",
        c
      ),
      t(
        "That being said, if you’re thinking about enlisting the services of a professional cleaning team in {city}, don’t hesitate to let us know. It’s only through acting on our company’s deeply-held values that we can ensure your home gets the attention it richly deserves.",
        c
      ),
      "We promise all of our clients phenomenal results, competitive pricing, and a level of communication that sets us apart from other companies. Our commitment to creating a well-rounded customer experience starts from the moment you pick up the phone to schedule an appointment, and it doesn’t end until our professionals leave your home in perfect condition.",
    ],

    principles: [
      "Our objective is to cater to your needs and establish a connection with you, as well as your loved ones and household. Our aim is to simplify your life rather than complicate it, by offering a hassle-free home cleaning service experience that you can rely on through the assistance of a reliable pair of cleaners.",
      "We have full assurance that you will observe the excellence in our services, encompassing our team and thorough cleaning procedures. As a result, we extend a 100% satisfaction guarantee, with no inquiries asked. If, within the initial 24 hours following completion of the service, you are dissatisfied, we will refund your payment in its entirety.",
    ],

    /* RESEARCH-class: whole paragraphs are per-city facts (ZIPs, landmarks) — slot ids home.zipParagraph / home.landmarksParagraph are part of the Plan 3 writer-schema contract. */
    zipParagraph: s(c, 'home.zipParagraph'),

    landmarksParagraph: s(c, 'home.landmarksParagraph'),

    workImages: [
      "/images/rn_image_picker_lib_temp_d129a169-21-1.jpg",
      "/images/rn_image_picker_lib_temp_7f5a4f2b-e3-1.jpg",
      "/images/Untitled-design.png",
      "/images/Untitled-design-1-2.png",
      "/images/Untitled-design-2.png",
    ],
  };
}
