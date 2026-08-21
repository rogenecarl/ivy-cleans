import Image from "next/image";
import Link from "next/link";
/* innerSite.copyright is the same verbatim string the front footer's 50e4d28
   heading renders; reused rather than duplicated so src/data stays untouched */
import type { SiteData } from "@/data/site";
import { ChevronRightIcon, EnvelopeIcon, PhoneIcon } from "./Icons";

/* live footer headings: 2rem/500 on mobile, 2.4rem/500 from the desktop breakpoint up */
const headingClass = "text-center text-[2rem] leading-[1.2em] font-medium md:text-start lg:text-[2.4rem]";
const dividerClass = "my-[2rem] border-t border-white";
/* post-2342.css d9d7ebf / 0c4df07: icon-list rows are separated by the widget's
   own gap (1.5rem in Contact, 0.8rem in Quick Links), split half as padding-bottom
   on every row but the last and half as margin-top on every row but the first */
const itemClass =
  "flex items-start justify-center gap-[0.6rem] text-[1.6rem] leading-[1.2em] font-medium md:justify-start";
const iconClass = "mt-[0.2rem] h-[1.6rem] w-[1.6rem] shrink-0";

export default function Footer({
  site,
  innerSite,
  quickLinks,
}: {
  site: SiteData["site"];
  innerSite: SiteData["innerSite"];
  /*
   * Home/Blog/Contact/FAQ, in that order. These used to be an inline literal
   * array here, which meant they were the one set of front-chrome links that
   * did NOT go through cityHref — a single click ejected a draft-city preview
   * to the default tenant. Built by (front)/layout.tsx instead.
   */
  quickLinks: { label: string; href: string }[];
}) {
  return (
    /* live mobile footer: no top padding on the section, everything centred */
    <footer className="bg-brand pb-[1rem] text-white md:py-[2rem] lg:py-[5rem]">
      <div className="ec">
        {/*
          live footer row (post-2342.css, >=768px): four columns at
          17.769% / 23.462% / 29.768% / 29.001%, each with elementor's 10px widget-wrap padding.
        */}
        <div className="mb-[1rem] flex flex-wrap md:mb-[4rem]">
          <div className="w-full p-[10px] md:w-[17.769%]">
            <Image
              src="/images/Logo-footer.png"
              alt="Ivy Cleans"
              width={165}
              height={84}
              /* live footer logo: max-width 16rem, 10rem at <=1024 — probe 160
                 @1920 / 133.11 @1440 / 128 @1280 / 100 @1024/768/390, i.e. a rem
                 cap on the ladder, not the fixed 133px this used to be. Written as
                 a width (not a max-width) so the lazy image still reserves its box
                 before it loads — the 165px source is always wider than the cap. */
              className="mx-auto h-auto w-[10rem] md:mx-0 lg:w-[16rem]"
            />
          </div>
          <div className="w-full p-[10px] md:w-[23.462%]">
            <h3 className={headingClass}>Contact</h3>
            <div className={dividerClass} />
            <ul className="space-y-[1.5rem]">
              <li className={itemClass}>
                <PhoneIcon className={iconClass} />
                <a href={site.phoneHref}>{site.phone}</a>
              </li>
              {/* Client instruction 2026-08-22: the office address is no longer
                  shown in the footer, phone and email only. This is a deliberate
                  divergence from the live site, which does render it here. */}
              <li className={itemClass}>
                <EnvelopeIcon className={iconClass} />
                <a href={`mailto:${site.email}`}>{site.email.toLowerCase()}</a>
              </li>
            </ul>
          </div>
          {/* live: this column's whole widget-wrap is inset a further 3rem (24.96px)
              inside the column, headings and list alike */}
          <div className="w-full px-[10px] py-[20px] md:mx-[3rem] md:w-[calc(29.768%-6rem)] md:py-[10px]">
            <h3 className={headingClass}>Quick Links</h3>
            <div className={dividerClass} />
            <ul className="mx-auto w-fit space-y-[0.8rem] md:mx-0 md:w-auto">
              {quickLinks.map((l) => (
                <li key={l.href} className={itemClass}>
                  <ChevronRightIcon className={iconClass} />
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full p-[10px] md:w-[29.001%]">
            <h3 className={headingClass}>Get In Touch</h3>
            <div className={dividerClass} />
            {/* live social icons render at a fixed 25px on a 95px column pitch */}
            <div className="mx-auto grid w-fit grid-cols-3 gap-x-[50px] lg:gap-x-[70px] gap-y-[27px] md:mx-0 md:gap-y-[2rem]">
              {site.socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener"
                  aria-label={s.label}
                  className="flex items-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.icon} alt="" width={25} height={25} className="h-[25px] w-[25px] invert" />
                </a>
              ))}
            </div>
          </div>
        </div>
        {/*
          live 2db93df: divider widget with 15px padding above/below a 1px rule, its
          widget-container carrying 3rem below and the kit's 2rem widget spacing on
          top of that (probe: rule at ry 281.8, copyright at ry 339.4).
        */}
        <div className="mb-[2rem] py-[15px] md:mb-[5rem]">
          <div className="border-t border-white" />
        </div>
        {/* live 50e4d28: 1.4rem/1.2em centred heading */}
        <h5 className="text-center text-[1.4rem] leading-[1.2em]">{innerSite.copyright}</h5>
      </div>
    </footer>
  );
}
