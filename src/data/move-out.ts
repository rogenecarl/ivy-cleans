// Verbatim copy from docs/superpowers/reference/ivycleans-live/move-out-content-dump.txt
// (lines 32-93) and move-out.html (meta description, elementor-241). "IVYCleans"
// casing, curly apostrophes (client’s, that’s, don’t, etc.), and lowercase
// sentence starts ("we understand...", "our expertise...") are preserved exactly
// as on the live site.
//
// CITY-class copy: whole paragraphs are the live site's copy verbatim, with
// only the {city}/{state} tokens inserted where "Minneapolis"/"MN" appeared.
// Strings without a city mention are intentionally left un-wrapped literals.
// Entire page is STATIC+CITY per the content contract — no AI slots here.

import type { CityContent } from '../content/types'
import { t } from '../content/interpolate'

export type MoveOutQuality = {
  title: string;
  text: string;
  icon: string;
  width: number;
  height: number;
  alt: string;
};

export type MoveOutData = {
  moveOutMeta: { title: string; description: string };
  moveHero: { h1: string; paragraphs: string[] };
  whyMoveOut: {
    h2: string;
    row1: { image: string; paragraphs: string[] };
    row2: { paragraphs: string[]; image: string };
  };
  included: { h2: string; items: string[] };
  whyIvy: {
    h2: string;
    intro: string;
    qualities: MoveOutQuality[];
    image: string;
  };
  cost: { h2: string; paragraphs: string[] };
};

export function moveOutData(c: CityContent): MoveOutData {
  return {
    moveOutMeta: {
      title: t("{city} Move Out Cleaning Services - Ivy Cleans", c),
      description: t(
        "Looking for a reliable move-out cleaning service in {city}? Look no further than IVYCleans! We understand that moving out of a house can be a daunting",
        c
      ),
    },

    moveHero: {
      h1: t("{city} Move Out Cleaning Services", c),
      paragraphs: [
        t(
          "Looking for a reliable move-out cleaning service in {city}? Look no further than IVYCleans! We understand that moving out of a house can be a daunting task, and cleaning the entire property before you leave can add to the stress. That’s why we offer comprehensive {city} move-out cleaning services to make the transition easier for you.",
          c
        ),
        "Our move-out cleaning service is designed to leave your property in top condition for the next tenants or the landlord. Our team of professionals pays attention to every detail when cleaning your property, ensuring that nothing is overlooked. We use the latest cleaning techniques and equipment to deliver outstanding results, and we’ll keep you informed every step of the way.",
        t(
          "Our move-out cleaning service in {city} includes dusting and wiping all surfaces, cleaning the floors, removing cobwebs, cleaning bathrooms and kitchens, emptying all trash cans and disposing of trash, cleaning windows and mirrors, cleaning light fixtures and switches, and much more.",
          c
        ),
        "At IVYCleans, we believe in open and honest communication with our clients. We’ll work closely with you to ensure that your property is cleaned to the highest standard and that you’re satisfied with the results. Our goal is to exceed your expectations and deliver great results every time.",
        t(
          "Don’t stress about cleaning your property before you leave. Contact IVYCleans today to schedule your {city} move-out cleaning service and make the transition easier and stress-free. We’ll take care of everything, so you can focus on your move and enjoy peace of mind knowing that your property is in good hands.",
          c
        ),
      ],
    },

    whyMoveOut: {
      h2: t("Move out cleaning {city}", c),
      row1: {
        image: "/images/out-img1.jpg",
        paragraphs: [
          t(
            "Move-out cleaning is an essential task that you should undertake before leaving a rental property in {city}. It’s a responsibility that ensures that the property is left in good condition for the next tenant or the landlord.",
            c
          ),
          "Move-out cleaning is also an excellent opportunity to inspect the property for any damages or repairs that need to be done. By identifying these issues early, you can address them before leaving the property and avoid any disputes or legal action in the future.",
        ],
      },
      row2: {
        paragraphs: [
          "Moreover, move-out cleaning gives you the chance to show that you’re a responsible tenant who takes care of the property. Leaving the property in excellent condition reflects positively on you as a tenant and can help you secure good references and recommendations for future rentals.",
          t(
            "In conclusion, move-out cleaning is an essential task that you should undertake before leaving a rental property in {city}. It’s your responsibility to ensure that the property is left in good condition for the next tenant or the landlord. Hiring a professional cleaning service like IVYCleans can make the task easier and more efficient, ensuring that the property is left spotless and ready for the next occupants.",
            c
          ),
        ],
        image: "/images/out-img2.jpg",
      },
    },

    included: {
      h2: "What services are included in a move-out cleaning?",
      items: [
        "Dusting and wiping all surfaces, including countertops, cabinets, and appliances",
        "Cleaning the floors, including vacuuming and mopping",
        "Removing cobwebs",
        "Cleaning bathrooms, including the shower, sink, and toilet",
        "Emptying all trash cans and disposing of trash",
        "Cleaning the kitchen, including the stove, oven, refrigerator, and dishwasher",
        "Cleaning the windows, window sills, and tracks",
        "Cleaning all mirrors",
        "Cleaning all light fixtures and switches",
        "Cleaning all baseboards and moldings",
        "Cleaning all doors and door frames",
      ],
    },

    whyIvy: {
      h2: t("Move out cleaning service in {city}", c),
      intro: t(
        "IVYCleans is an excellent choice for move-out cleaning services in {city} because we provide exceptional attention to detail, and expertise, have a long-standing time in the industry, have effective communication, and have consistent quality.",
        c
      ),
      qualities: [
        {
          title: "Attention to Detail",
          text: "Our attention to detail is unparalleled, and we leave no stone unturned when it comes to ensuring that the property is left in pristine condition. we understand that every nook and cranny of the property needs to be thoroughly cleaned, and we use specialized equipment and techniques to achieve this.",
          icon: "/images/service-icon1.png",
          width: 86,
          height: 86,
          alt: "",
        },
        {
          title: "Expertise",
          text: t(
            "IVYCleans has years of experience in providing move-out cleaning services in {city}. We have honed our skills over the years and can tackle even the most challenging cleaning tasks. our expertise ensures that the job is done efficiently and effectively, saving you time and energy.",
            c
          ),
          icon: "/images/service-icon3.png",
          width: 87,
          height: 87,
          alt: "",
        },
        {
          title: "Industry experience",
          text: "The company has been in the industry for a long time, and this longevity is a testament to its commitment to providing high-quality services. We have built a reputation for excellence, and our track record speaks for itself.",
          icon: "/images/out-icon1.png",
          width: 87,
          height: 87,
          alt: "",
        },
        {
          title: "Effective communication",
          text: "Effective communication is another hallmark of IVYCleans’ move-out cleaning services. We listen to our client’s needs and requirements, and we keep them updated throughout the cleaning process. This communication ensures that everyone is on the same page, and there are no surprises at the end of the job. From the second you call us, you’ll realize what separates us from the competition.",
          icon: "/images/out-icon2.png",
          width: 87,
          height: 79,
          alt: "",
        },
        {
          title: "High-quality results",
          text: "Finally, high quality is a top priority for IVYCleans. we strive to maintain our high standards of cleaning on every job we undertake, ensuring that every property is left spotless and ready for the next occupants. We refuse to turn in a house to a client without making sure that it not only reaches our standards but also, those of the client.",
          icon: "/images/out-icon3.png",
          width: 88,
          height: 88,
          alt: "In this image we explain what are the things you would like to ask your cleaning service provider",
        },
      ],
      image: "/images/out-img3.jpg",
    },

    cost: {
      h2: "How much does a move-out cleaning cost?",
      paragraphs: [
        "The cost of move-out cleaning services can vary depending on several factors. The size of the property, the level of cleaning required, and the location are some of the key factors that can influence the price.",
        "Smaller properties typically cost less to clean than larger ones, as there is less surface area to cover. However, the level of cleaning required can also play a role. If the property is particularly dirty or has not been cleaned regularly, it may require more time and effort to clean, which can increase the cost.",
        "The location of the property can also affect the price of move-out cleaning services. Properties in more affluent areas or those that are more difficult to access may be more expensive to clean due to the additional time and resources required.",
        t(
          "IVYCleans is committed to providing top-quality move-out cleaning services in {city}. Schedule your cleaning appointment today to ensure your property is left spotless before you leave.",
          c
        ),
      ],
    },
  };
}
