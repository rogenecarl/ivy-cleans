export const site = {
  phone: "612-424-0391",
  phoneHref: "tel:6124240391",
  email: "Support@ivycleans.com",
  address: "5821 Cedar Lake Road,West Unit 208, Minneapolis, N 55416",
  bookingUrl: "/book-now",
  googleMapsUrl: "https://maps.google.com/?cid=6546505722522773891",
  writeReviewUrl:
    "https://search.google.com/local/writereview?placeid=ChIJT35locmWcKMRgykID0Xc2Vo",
  nav: [
    { label: "Home", href: "/home" },
    { label: "Cleaning Services", href: "/cleaning-services" },
    { label: "Deep Cleaning Minneapolis", href: "/deep-cleaning-minneapolis" },
    {
      label: "Minneapolis Move Out Cleaning Services",
      href: "/minneapolis-move-out-cleaning-services",
    },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
    { label: "FAQ", href: "/faq" },
  ],
  socials: [
    { label: "Facebook", href: "https://www.facebook.com/ivy.cleans1/", icon: "/icons/facebook.svg" },
    { label: "Twitter", href: "https://twitter.com/Ivycleans", icon: "/icons/x.svg" },
    { label: "YouTube", href: "https://www.youtube.com/channel/UCZIsiCt4aoUbrzbPmpVwQGA", icon: "/icons/youtube.svg" },
    { label: "Instagram", href: "https://www.instagram.com/ivy.cleans1/", icon: "/icons/instagram.svg" },
    { label: "Pinterest", href: "https://www.pinterest.com/ivycleans/", icon: "/icons/pinterest.svg" },
    { label: "TikTok", href: "https://www.tiktok.com/@ivy.cleans1", icon: "/icons/tiktok.svg" },
  ],
} as const;

export const innerSite = {
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
  footerPhone: "612-424-0391",
  email: "support@ivycleans.com",
  address: "5821 Cedar Lake Road, West Unit 208, Minneapolis, MN 55416",
  bookUrl: "/book",
  copyright: "© 2026 IvyCleans. All rights reserved.",
  servicesLinks: [
    { label: "Book Now", href: "/book" },
    { label: "Cleaning Services", href: "/cleaning-services" },
  ],
  companyLinks: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Contact Us", href: "/contact" },
    { label: "FAQ", href: "/faq" },
  ],
  footerLinks: [
    { label: "Home", href: "/home" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
    { label: "FAQ", href: "/faq" },
    { label: "Privacy Policy", href: "/privacy-policy" },
  ],
} as const;
