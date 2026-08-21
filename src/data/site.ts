// src/data/site.ts
import type { CityContent } from '../content/types'
import { cityHref, t } from '../content/interpolate'

export type SiteData = {
  site: {
    phone: string;
    phoneHref: string;
    email: string;
    bookingUrl: string;
    googleMapsUrl: string;
    writeReviewUrl: string;
    nav: { label: string; href: string }[];
    socials: { label: string; href: string; icon: string }[];
  };
  innerSite: {
    phone: string;
    phoneHref: string;
    footerPhone: string;
    email: string;
    bookUrl: string;
    copyright: string;
    servicesLinks: { label: string; href: string }[];
    companyLinks: { label: string; href: string }[];
    footerLinks: { label: string; href: string }[];
  };
};

export function siteData(c: CityContent): SiteData {
  return {
    site: {
      phone: c.phone,
      phoneHref: c.phoneHref,
      email: "Support@ivycleans.com",
      /*
       * Every internal href below goes through cityHref(): a live city is
       * served from its own host and keeps the public path (identity), a draft
       * city gets the `/<cityKey>` prefix so its preview stays browsable.
       */
      bookingUrl: cityHref(c, "/book-now"),
      // Business-profile URLs (cid/placeid): one physical Google listing shared by
      // all cities for now — per-city listings are an open client question.
      googleMapsUrl: "https://maps.google.com/?cid=6546505722522773891",
      writeReviewUrl:
        "https://search.google.com/local/writereview?placeid=ChIJT35locmWcKMRgykID0Xc2Vo",
      nav: [
        { label: "Home", href: cityHref(c, "/home") },
        { label: "Cleaning Services", href: cityHref(c, "/cleaning-services") },
        /*
         * The two per-city service pages. Their slugs are city-derived and are
         * served by the single [serviceSlug] dynamic segment, so no route
         * folder has to exist per city (the Plan-2 trap this comment used to
         * record is resolved). The sibling trap — Header.tsx and
         * inner/InnerHeader.tsx matching these labels against hardcoded
         * "…Minneapolis" strings — is resolved too: both split site.nav by
         * index instead.
         */
        {
          label: t("Deep Cleaning {city}", c),
          href: cityHref(c, "/services/deep-cleaning"),
        },
        {
          label: t("{city} Move Out Cleaning Services", c),
          href: cityHref(c, "/services/move-in-move-out-cleaning"),
        },
        { label: "Blog", href: cityHref(c, "/blog") },
        { label: "Contact", href: cityHref(c, "/contact") },
        { label: "FAQ", href: cityHref(c, "/faq") },
      ],
      socials: [
        { label: "Facebook", href: "https://www.facebook.com/ivy.cleans1/", icon: "/icons/facebook.svg" },
        { label: "Twitter", href: "https://twitter.com/Ivycleans", icon: "/icons/x.svg" },
        { label: "YouTube", href: "https://www.youtube.com/channel/UCZIsiCt4aoUbrzbPmpVwQGA", icon: "/icons/youtube.svg" },
        { label: "Instagram", href: "https://www.instagram.com/ivy.cleans1/", icon: "/icons/instagram.svg" },
        { label: "Pinterest", href: "https://www.pinterest.com/ivycleans/", icon: "/icons/pinterest.svg" },
        { label: "TikTok", href: "https://www.tiktok.com/@ivy.cleans1", icon: "/icons/tiktok.svg" },
      ],
    },
    innerSite: {
      /*
       * DELIBERATELY STILL LITERAL: the inner chrome's 612-482-5001 is a second
       * phone line distinct from the main number. Whether a new city gets one
       * number or two is an open question for the client — resolved in Plan 3's
       * admin form. Do not tokenize until then.
       */
      phone: "612-482-5001",
      phoneHref: "tel: +16124825001", // verbatim from live href, including the space
      /*
       * The inner footer's icon-list phone (d439f43 on both home.html and
       * cleaning-services.html) is a *different* number from the hero/CTA "Call
       * Us Now!" buttons above — 612-424-0391, rendered as plain text with no
       * tel: href on the live page (unlike the hero/CTA buttons, which are real
       * <a href="tel:..."> links). InnerFooter renders this in a <span>, so no
       * href field is kept here.
       */
      footerPhone: c.phone,
      email: "support@ivycleans.com",
      bookUrl: cityHref(c, "/book"),
      copyright: "© 2026 IvyCleans. All rights reserved.",
      servicesLinks: [
        { label: "Book Now", href: cityHref(c, "/book") },
        { label: "Cleaning Services", href: cityHref(c, "/cleaning-services") },
      ],
      companyLinks: [
        { label: "Privacy Policy", href: cityHref(c, "/privacy-policy") },
        { label: "Contact Us", href: cityHref(c, "/contact") },
        { label: "FAQ", href: cityHref(c, "/faq") },
      ],
      footerLinks: [
        { label: "Home", href: cityHref(c, "/home") },
        { label: "Blog", href: cityHref(c, "/blog") },
        { label: "Contact", href: cityHref(c, "/contact") },
        { label: "FAQ", href: cityHref(c, "/faq") },
        { label: "Privacy Policy", href: cityHref(c, "/privacy-policy") },
      ],
    },
  };
}
