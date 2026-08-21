import Image from "next/image";
import Link from "next/link";
import type { SiteData } from "@/data/site";
import { EnvelopeIcon, PhoneIcon } from "@/components/Icons";

/*
 * Inner-template footer. The live footer template ships four sections but the
 * first two (f18b62f "Services"/"Book Now" + ae38e06 copyright) carry
 * elementor-hidden-desktop/laptop/tablet_extra/tablet/mobile — i.e. they never
 * render at any breakpoint. What is visible is d439f43 (logo + contact /
 * Links / Get In Touch) followed by 6466cfa (copyright + "Ivy Cleans"), on the
 * template's #FDECE7 background with #37745F type throughout.
 *
 * Round-7 live probe (ivycleans.com/home + /cleaning-services, identical, at
 * 1440 / 1024 / 768 / 390 — root font 8.32px at 1440, 10px at the rest):
 *
 *   section d439f43 padding : 4rem/3rem @>=1025 | 3rem/1rem @768-1024 | 1rem/0 @mobile
 *   section 6466cfa padding : 0 top, 1rem bottom at every width
 *   every column           : the widget-wrap's flat 10px gutter (our .ec padding)
 *   widget bottom margins  : 2rem (logo image adds another 1rem >=768)
 *   heading (Links/GIT)    : 3rem @>=1025 | 2rem @768-1024 | 1.8rem @mobile, 1.2em
 *   Links items            : line-height 20px flat, no padding, 1rem apart
 *   contact items          : 1.8rem @>=768 / 1.6rem @mobile, 1.2em, 1.5rem/1rem apart
 *   social icons           : 3rem @>=768 / 2.8rem @mobile, 20px apart, rows 2rem
 *   copyright lines        : 1.4rem then 1.6rem/600, both 1.2em, 2rem apart
 *
 * Totals it reproduces: 332.94px @1440 and 654.67px @390 (live: 332.94 / 654.67).
 */
/* live: the footer H4s measure font-weight 600 (not the kit's h4 default of 700).
   The 2rem bottom margin is the heading widget's own, at every width. */
const headingClass =
  "mb-[2rem] text-[1.8rem] leading-[1.2em] font-semibold md:text-[2rem] lg:text-[3rem]";
const itemClass =
  "flex items-start text-[1.6rem] leading-[1.2em] md:text-[1.8rem]";
/* live .elementor-icon-list-icon: a 1.25em-wide, 1em-tall box holding a 1em
   glyph, then a flat 5px before the label; the box is nudged 0.1em down so the
   glyph centres on the first 1.2em line. */
const iconClass =
  "mt-[0.1em] ml-[0.125em] mr-[calc(0.125em+5px)] h-[1em] w-[1em] shrink-0";

export default function InnerFooter({
  site,
  innerSite,
}: {
  site: SiteData["site"];
  innerSite: SiteData["innerSite"];
}) {
  return (
    <footer className="text-herogreen bg-[#FDECE7] pt-[1rem] pb-[1rem] md:pt-[3rem] lg:pt-[4rem]">
      {/* live's box model puts the 10px gutter on each column's widget-wrap and
          leaves `.elementor-container` unpadded, so the thirds divide the full
          container width. `.ec` folds both together, which double-counts the
          gutter once the row splits into columns — drop its horizontal padding
          from 768 up, where the columns supply their own (probe @1440: column 2
          x=565.0 w=310.02 live, 568.3/303.3 before, 564.98/310.03 after).
          `.ec` is an unlayered rule in globals.css, so it beats a plain
          `md:px-0` utility — the trailing `!` is required. */}
      <div className="ec flex flex-wrap md:px-0!">
        {/* logo + contact */}
        <div className="w-full text-center md:w-1/3 md:px-[10px] md:text-start">
          {/* live image widget: 13rem wide, 2rem of widget margin plus a further
              1rem on its container from 768 up */}
          <Image
            src="/images/Logo.png"
            alt="Ivy Cleans"
            width={309}
            height={149}
            className="mx-auto mb-[2rem] h-auto w-[13rem] md:mx-0 md:mb-[3rem]"
          />
          <ul className="space-y-[1rem] md:space-y-[1.5rem]">
            <li className={`${itemClass} justify-center md:justify-start`}>
              <PhoneIcon className={iconClass} />
              <span>{innerSite.footerPhone}</span>
            </li>
            {/* Client instruction 2026-08-22: the office address is no longer
                shown in the footer, phone and email only. This is a deliberate
                divergence from the live site, which does render it here. */}
            <li className={`${itemClass} justify-center md:justify-start`}>
              <EnvelopeIcon className={iconClass} />
              {/* live renders the email as plain text — no mailto anchor */}
              <span>{innerSite.email}</span>
            </li>
          </ul>
        </div>
        {/* Links — stacked at mobile, where live's 3rem gap is the two columns'
            10px gutters plus the heading container's mobile-only 1rem */}
        <div className="mt-[3rem] w-full text-center md:mt-0 md:w-1/3 md:px-[10px]">
          <h4 className={headingClass}>Links</h4>
          <ul className="inline-block space-y-[1rem] text-start">
            {innerSite.footerLinks.map((l) => (
              <li key={l.label}>
                {/* live a.elementor-item: no padding, flat 20px line-height */}
                <Link
                  href={l.href}
                  className="hover:text-rust block text-[1.6rem] leading-[20px]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {/* Get In Touch */}
        <div className="mt-[3rem] w-full text-center md:mt-0 md:w-1/3 md:px-[10px]">
          <h4 className={headingClass}>Get In Touch</h4>
          {/* two social-icon widgets of three => a fixed 3-column grid; live's
              column gap is a flat 20px, the row gap the second widget's 2rem */}
          <div className="mx-auto grid w-fit grid-cols-3 gap-x-[20px] gap-y-[2rem]">
            {site.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener"
                aria-label={s.label}
              >
                <span
                  className="bg-herogreen mx-auto block h-[2.8rem] w-[2.8rem] md:h-[3rem] md:w-[3rem]"
                  style={{
                    maskImage: `url(${s.icon})`,
                    WebkitMaskImage: `url(${s.icon})`,
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                  }}
                />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* copyright — live renders both lines as headings, so they are 1.2em; the
          `!` defeats globals.css's unlayered `p { line-height: 1.5 }`, which
          otherwise beats any layered leading-* utility. */}
      <div className="ec text-center md:mt-[1rem] lg:mt-[3rem]">
        <p className="mb-[2rem] text-[1.4rem] leading-[1.2em]!">
          {innerSite.copyright}
        </p>
        <p className="text-[1.6rem] leading-[1.2em]! font-semibold">Ivy Cleans</p>
      </div>
    </footer>
  );
}
