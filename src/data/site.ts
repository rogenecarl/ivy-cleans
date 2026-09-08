// src/data/site.ts
import type { CityContent } from '../content/types'
import { cityHref } from '../content/interpolate'
import { allServices } from './services/registry'

export type SiteData = {
  site: {
    phone: string;
    phoneHref: string;
    email: string;
    bookingUrl: string;
    nav: { label: string; href: string }[];
    serviceNav: { label: string; href: string }[];
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
      // every internal href goes through cityHref
      bookingUrl: cityHref(c, "/book-now"),
      // top-level items only; services hang off Cleaning Services via serviceNav, never sliced from here by index
      nav: [
        { label: "Home", href: cityHref(c, "/home") },
        { label: "Cleaning Services", href: cityHref(c, "/cleaning-services") },
        { label: "Blog", href: cityHref(c, "/blog") },
        { label: "Contact", href: cityHref(c, "/contact") },
        { label: "FAQ", href: cityHref(c, "/faq") },
      ],
      // built from the registry so the menu can't drift from the pages
      serviceNav: allServices().map((s) => ({
        label: s.name,
        href: cityHref(c, `/services/${s.slug}`),
      })),
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
      // one number per city (the live Minneapolis site had a second line here)
      phone: c.phone,
      phoneHref: c.phoneHref,
      // inner footer phone: plain text on live, no tel: href
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
