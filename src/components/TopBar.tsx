import Image from "next/image";
import Link from "next/link";
import type { SiteData } from "@/data/site";
import { TileIcon } from "./Icons";

/*
 * Live template post-2338: one boxed section with three real elementor columns
 * whose widths are percentages of the 132rem container — not the justify-between
 * flex row this used to be, which put the phone/email/CTA a few px off at 1440
 * and ~130px off at 1920:
 *
 *   f38703e (logo)     15% | 16% <=1280 | 17% 768-1024 | 100% <=767
 *   5ac9804 (contact)  61.014% | 45% 768-1024 | 100% <=767
 *                      (widget-wrap justify-content:center, align-items:center)
 *   f4e0a01 (CTA)      23.65% | 24% <=1280 | 38% 768-1024 | 100% <=767
 *
 * Each column carries elementor's own 10px widget-wrap padding, so the section
 * container itself gets none (hence max-w-[132rem] here rather than `.ec`).
 * Live probe @1920 confirms both derivations: the contact group's centre lands
 * on the column centre (900.69 vs 900.70) and the CTA anchor's right edge on the
 * column's 10px content edge (1605.5 vs 1605.6).
 */
export default function TopBar({
  site,
  homeHref,
}: {
  site: SiteData["site"];
  /* cityHref(c, "/") — "/" for a live tenant, "/<cityKey>" for a draft preview. */
  homeHref: string;
}) {
  return (
    <div className="bg-white">
      {/* the columns are elementor flex items: at 1025-1280 they sum to 101.014%
          and *shrink* to fit rather than wrap (live @1280 keeps one row), so the
          wrapping is mobile-only */}
      <div className="mx-auto flex max-w-[132rem] flex-wrap items-center md:flex-nowrap">
        {/* 889f16a: img max-width 16.5rem, 10rem at <=1024 (live: 165 @1920,
            137.27 @1440, 100 @1024); text-align start, centred at <=767 */}
        <div className="flex w-full items-center p-[10px] md:w-[17%] lg:w-[16%] xl:w-[15%]">
          <Link href={homeHref} className="w-full text-center md:text-start">
            <Image
              src="/images/Logo.png"
              alt="Ivy Cleans"
              width={309}
              height={149}
              className="inline-block h-auto w-[10rem] lg:w-[16.5rem]"
              fetchPriority="high"
              loading="eager"
            />
          </Link>
        </div>
        <div className="flex w-full flex-wrap items-center justify-between px-[10px] md:w-[45%] md:justify-center md:py-[10px] lg:w-[61.014%]">
          {/* f223d44: widget-container margin 0 3rem 0 0 (desktop) / 0 0 2rem 0
              (<=1024) / 0 1rem 0 0 (<=767, where the box is 50% wide);
              icon-box-wrapper gap 15px (a fixed px value, not a rem one) */}
          <div className="flex w-1/2 flex-col items-center pr-[1rem] text-center md:mb-[2rem] md:w-auto md:flex-row md:items-start md:gap-[15px] md:pr-0 md:text-left lg:mr-[3rem] lg:mb-0">
            <TileIcon kind="phone" />
            <div className="w-full min-w-0 md:w-auto">
              <h3 className="mt-[0.5rem] text-[1.4rem] leading-[1.2em] font-light">
                <a href={site.phoneHref}>Prefer to call? We&rsquo;re available now.</a>
              </h3>
              <p className="text-[1.8rem] leading-[1.5em] font-medium break-words md:text-[2rem]">
                <a href={site.phoneHref}>{site.phone}</a>
              </p>
            </div>
          </div>
          {/* 0d98ab4: same icon-box widget; at <=767 both boxes are 50% wide with
              a 1rem inner margin (live probe @390: each description box is 175 wide
              at x=10 and x=205, i.e. 185 - 10) */}
          <div className="flex w-1/2 flex-col items-center pl-[1rem] text-center md:w-auto md:flex-row md:items-start md:gap-[15px] md:pl-0 md:text-left">
            <TileIcon kind="email" />
            <div className="w-full min-w-0 md:w-auto">
              <h3 className="mt-[0.5rem] text-[1.4rem] leading-[1.2em] font-light">
                <a href={`mailto:${site.email}`}>Email</a>
              </h3>
              <p className="text-[1.8rem] leading-[1.5em] font-medium break-words md:text-[2rem]">
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </p>
            </div>
          </div>
        </div>
        {/* 5dbc9f4: button 1.8rem, 1.6rem at <=1024; right-aligned in its column */}
        <div className="flex w-full justify-center py-[1rem] md:w-[38%] md:justify-end md:p-[10px] lg:w-[24%] xl:w-[23.65%]">
          <Link
            href={site.bookingUrl}
            className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[0.1rem] px-[2.4rem] py-[1.1rem] text-[1.6rem] leading-[1.2em] font-bold text-white uppercase transition-colors hover:bg-white lg:text-[1.8rem]"
          >
            SET AN APPOINTMENT 👈
          </Link>
        </div>
      </div>
    </div>
  );
}
