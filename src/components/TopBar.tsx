import Image from "next/image";
import Link from "next/link";
import type { SiteData } from "@/data/site";
import { TileIcon } from "./Icons";

// post-2338: three columns of the 132rem container — logo f38703e 15%/16%/17%/100%, contact 5ac9804 61.014%/45%/100%,
// CTA f4e0a01 23.65%/24%/38%/100%; each carries its own 10px gutter.
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
      {/* columns shrink to fit at 1025-1280; wrapping is mobile-only */}
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
          {/* f223d44: margin 0 3rem 0 0 / 0 0 2rem 0 / 0 1rem 0 0; icon-box gap 15px */}
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
          {/* 0d98ab4: both boxes 50% wide with a 1rem inner margin at <=767 */}
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
