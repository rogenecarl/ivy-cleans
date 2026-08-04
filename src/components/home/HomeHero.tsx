import Link from "next/link";
import { heroParagraphs } from "@/data/services";
import { innerSite } from "@/data/site";

/*
 * Section 219b11a0 (post-8.css): cleaning-bg-desktop.jpg, swapped for
 * cleaning-bg-mbl.jpg below 768px, both `top center / cover`. Padding
 * 8rem 0 13rem (desktop), 3rem 0 3rem (<=1024), 2rem 0 1rem (<=767). The copy
 * and buttons live in the nested section 7259eefa whose first column is
 * 55.098% wide (65% at 768–1024), leaving the photo on the right visible.
 */
export default function HomeHero() {
  return (
    <section className="home-hero bg-cover bg-top bg-no-repeat pt-[2rem] pb-[1rem] md:py-[3rem] lg:pt-[8rem] lg:pb-[13rem]">
      <div className="ec">
        <h1 className="text-herogreen text-center text-[3rem] leading-[1.2em] font-bold uppercase md:text-[4rem] lg:text-[7.2rem]">
          Cleaning Services Minneapolis
        </h1>
        <div className="flex flex-wrap lg:mt-[1rem]">
          {/* elementor's widget-wrap 10px: live copy measures x=245/w=514 @1440
              and x=20/w=350 @390 — i.e. inset 10px inside the column */}
          <div className="w-full px-[10px] md:w-[65%] lg:w-[55.098%]">
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
                href="/book"
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
          <div className="hidden md:block md:w-[35%] lg:w-[44.861%]" />
        </div>
      </div>
    </section>
  );
}
