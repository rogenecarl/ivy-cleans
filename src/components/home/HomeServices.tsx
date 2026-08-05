import Image from "next/image";
import { serviceIntro, services } from "@/data/services";
import { innerSite } from "@/data/site";

/*
 * Section 6cbc7976 (post-8.css): padding 6rem (>=1280) / 3rem (768–1024) /
 * 2rem (<=767). Heading 176e9adf is 4.5/4/2.8rem and its widget carries
 * `margin-bottom:2rem`, which the widget-container cancels down to 1rem at
 * <=767 (live: 20px widget margin + a -10px container margin). The intro
 * 70c713c2 is 2/1.9/1.7rem capped at 112rem; its container adds a 3rem bottom
 * margin at >=1280 that collapses with the last paragraph's own 2rem, so the
 * net gap to the cards is 3rem there and 2rem at <=1024 (`lg:mb-[1rem]` on top
 * of the retained 2rem).
 *
 * Cards are image boxes at `max-width:33.33%` from 768 up (100% at <=767 — the
 * missing tablet rule was worth ~2.6k px of document height at 1024). Widget
 * padding 2rem (>=1280) / 1rem (<=1024); the 4th and 5th (7b8a2c27 / 5f81c296)
 * add a 6rem/3rem/1rem top padding that starts their second row. Inside the
 * box the figure is `inline-block`, so the gap to the title is its 1rem margin
 * plus the line-box descender (~0.4rem) plus the title's own 0.5rem top margin
 * — 1.9rem net (live: 19px @1024/1920, 15.95 @1440).
 *
 * The closing button aeb05a4 is 1.9rem at every width with 17px/30px padding
 * (17px/20px at <=767, where it is also left-aligned) and a 3rem top margin
 * only at >=1280.
 */
export default function HomeServices() {
  return (
    <section className="bg-white py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec flex flex-col">
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[2rem] md:text-[4rem] lg:text-[4.5rem]">
          Professional Cleaning Services Minneapolis, MN
        </h2>
        <div className="mx-auto max-w-[112rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:mb-[1rem] lg:text-[2rem]">
          {serviceIntro.map((p) => (
            <p key={p.slice(0, 40)} className="mb-[2rem]">
              {p}
            </p>
          ))}
        </div>
        <div className="flex flex-wrap justify-center">
          {services.map((s, i) => (
            <article
              key={s.title}
              className={`w-full p-[1rem] text-center md:w-1/3 lg:p-[2rem] ${
                i >= 3 ? "md:pt-[3rem] lg:pt-[6rem]" : ""
              }`}
            >
              <Image
                src={s.image}
                alt={s.alt}
                width={s.width}
                height={s.height}
                className="mb-[1.9rem] h-auto w-full"
              />
              <h3 className="mb-[10px] text-[2rem] leading-[1.2em] font-bold uppercase md:text-[2.2rem] lg:text-[2.7rem]">
                {s.title}
              </h3>
              <p className="text-[1.6rem] leading-[1.5em] font-light">{s.text}</p>
            </article>
          ))}
        </div>
        <div className="text-left md:text-center lg:mt-[3rem]">
          <a
            href={innerSite.phoneHref}
            className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[20px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white md:px-[30px]"
          >
            Call Us Now!
          </a>
        </div>
      </div>
    </section>
  );
}
