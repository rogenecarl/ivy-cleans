import Link from "next/link";
import type { SiteData } from "@/data/site";
import type { TokenSource } from "@/content/interpolate";
import { t } from "@/content/interpolate";

/*
 * Section 219b11a0 (post-8.css): cleaning-bg-desktop.jpg, swapped for
 * cleaning-bg-mbl.jpg below 768px, both `top center / cover`. Padding
 * 8rem 0 13rem (>=1280), 3rem 0 3rem (768–1024), 2rem 0 1rem (<=767).
 *
 * Box model (live probe at 1920/1600/1440/1280/1024/768/390): `.ec` stands in
 * for `.elementor-container` *plus* the widget-wrap's 10px gutter. Every live
 * widget-wrap is `display:flex`, so a text widget's trailing paragraph margin
 * is kept instead of collapsing into the next widget — hence `flex flex-col`
 * here and on the copy column. Widget rhythm: the h1 widget has
 * `margin-bottom:2rem` at >=768 and 0 below (its container cancels it with
 * -2rem); the nested section 7259eefa adds `margin-top:1rem` at >=1280 only.
 *
 * Columns: 55.098% copy / 44.86% art. Below 1025 the art column keeps its
 * 44.86% while the copy column goes to 65%, so it wraps onto its own line and
 * live measures it 1px tall there (390: 100% wide, also 1px).
 */
export default function HomeHero({
  heroParagraphs,
  innerSite,
  bits,
}: {
  heroParagraphs: string[];
  innerSite: SiteData["innerSite"];
  bits: TokenSource;
}) {
  return (
    <section className="home-hero bg-cover bg-top bg-no-repeat pt-[2rem] pb-[1rem] md:py-[3rem] lg:pt-[8rem] lg:pb-[13rem]">
      <div className="ec flex flex-col">
        <h1 className="text-herogreen text-center text-[3rem] leading-[1.2em] font-bold uppercase md:mb-[2rem] md:text-[4rem] lg:text-[7.2rem]">
          {t("Cleaning Services {city}", bits)}
        </h1>
        <div className="flex flex-wrap lg:mt-[1rem]">
          {/* elementor's widget-wrap 10px on all four sides: live copy measures
              x=245/y=337.86 @1440 and x=20 @390 — i.e. inset 10px in the column */}
          <div className="flex w-full flex-col p-[10px] md:w-[65%] lg:w-[55.098%]">
            <div className="text-[1.6rem] leading-[1.5em] font-light md:text-[1.8rem] lg:text-[1.9rem]">
              {heroParagraphs.map((p, i) => (
                <p
                  key={p.slice(0, 40)}
                  className={`mb-[2rem] ${
                    i === heroParagraphs.length - 1 ? "font-bold" : ""
                  }`}
                >
                  {p}
                </p>
              ))}
            </div>
            <div className="flex flex-wrap items-center lg:mt-[3rem]">
              <Link
                href={innerSite.bookUrl}
                className="bg-rust border-rust hover:text-rust w-full rounded-[5px] border-[1px] px-[20px] py-[17px] text-center text-[1.8rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white md:w-auto lg:mr-[2rem] lg:text-[1.9rem]"
              >
                Book A Cleaning 👉
              </Link>
              <a
                href={innerSite.phoneHref}
                className="border-rust text-rust hover:bg-rust mt-[1rem] w-full rounded-[5px] border-[1px] px-[20px] py-[17px] text-center text-[1.8rem] leading-[1.2em] font-bold tracking-[1px] uppercase transition-colors hover:text-white md:mt-0 md:ml-[1rem] md:w-auto lg:ml-0 lg:px-[30px] lg:text-[1.9rem]"
              >
                Call Us Now!
              </a>
            </div>
          </div>
          <div className="h-[1px] w-full md:w-[44.86%] lg:h-auto" />
        </div>
      </div>
    </section>
  );
}
