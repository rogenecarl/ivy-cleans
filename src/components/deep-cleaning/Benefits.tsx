import Image from "next/image";
import Link from "next/link";
import { CheckItemIcon } from "@/components/Icons";
import { benefits, benefitsBgImage } from "@/data/deep-cleaning";

/*
 * Section b30eca6 ("deep-sec03"): deep-bg2.jpg background declared with no
 * position/size/repeat overrides, so it keeps the CSS defaults (0 0 / auto /
 * repeat). Padding 6/3/2rem. Heading (c019ab6) centered 4.5/4/2.8rem with a
 * 1rem bottom margin at desktop only; intro paragraphs (648bcac)
 * left-aligned 2/1.9/1.7rem font-light. NOTE: the live text-editor widget
 * also contains an injected Vavada Casino / beadspinnerstore.com spam
 * paragraph between the two real paragraphs and the list intro —
 * deliberately excluded here, so this section is ~1 paragraph shorter than
 * live.
 *
 * Inner section 878b0c4 (margin-bottom 4rem, 2rem at mobile) splits 50/50:
 * column 77a4832 (padding-right 1rem; padding-bottom 1rem at mobile) carries
 * the listIntro (045ef5e) + icon-list 43f5286; column b086ade
 * (padding-left 1rem; padding-top 1rem at mobile) carries the deep-bg4.jpg
 * image. Neither column overrides align-items, so both sit at the top.
 *
 * Icon list 43f5286: text 2/1.9/1.7rem font-light black, line-height 1.4em;
 * icon 2/1.9/1.7rem in #5A8E00 inside a 1.25em-wide box (icon size + the
 * 0.25em --e-icon-list-icon-margin, measured 20.8px at 1440), no extra icon
 * padding; items separated by 1.5rem (0.75rem padding-bottom + 0.75rem
 * margin-top); --icon-vertical-offset 1px.
 *
 * Spacing model throughout both pages: every non-last Elementor widget adds
 * a 2rem bottom margin (width-initial widgets excepted), each text-editor
 * <p> adds its own 2rem, and the per-widget widget-container margins from
 * the page CSS stack on top. The wrappers below are flow-root so those
 * paragraph margins do not collapse out, exactly as they cannot on the live
 * page (widgets are flex items of .elementor-widget-wrap).
 *
 * Outro (11ebcf1) matches the intro paragraph style; button (216a703) is
 * centered with a 1rem top margin at desktop only.
 */
export default function Benefits() {
  return (
    <section className="bg-[url(/images/deep-bg2.jpg)] py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:mb-[3rem] lg:text-[4.5rem]">
          {benefits.h2}
        </h2>
        <div className="flow-root mb-0 lg:mb-[2rem]">
          {benefits.intro.map((p) => (
            <p
              key={p.slice(0, 40)}
              className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]"
            >
              {p}
            </p>
          ))}
        </div>

        <div className="mb-[2rem] flex flex-wrap items-start md:mb-[4rem]">
          <div className="w-full pb-[1rem] md:w-[50%] md:pr-[1rem] md:pb-0">
            <div className="flow-root mb-0 lg:mb-[2rem]">
              <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
                {benefits.listIntro}
              </p>
            </div>
            <ul>
              {benefits.items.map((item) => (
                <li
                  key={item}
                  className="mb-[1.5rem] flex items-start last:mb-0"
                >
                  <span className="mt-[1px] flex w-[2.125rem] shrink-0 md:w-[2.375rem] lg:w-[2.5rem]">
                    <CheckItemIcon className="h-[1.7rem] w-[1.7rem] text-[#5A8E00] md:h-[1.9rem] md:w-[1.9rem] lg:h-[2rem] lg:w-[2rem]" />
                  </span>
                  <span className="text-[1.7rem] leading-[1.4em] font-light text-black md:text-[1.9rem] lg:text-[2rem]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full pt-[1rem] md:w-[50%] md:pt-0 md:pl-[1rem]">
            <Image
              src={benefitsBgImage}
              alt=""
              width={800}
              height={390}
              className="h-auto w-full"
            />
          </div>
        </div>

        <div className="flow-root mb-0 lg:mb-[2rem]">
          <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
            {benefits.outro}
          </p>
        </div>

        <div className="text-center">
          <Link
            href="/book"
            className="bg-rust border-rust hover:text-rust inline-block lg:mt-[1rem] rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white"
          >
            Set an appointment 👈
          </Link>
        </div>
      </div>
    </section>
  );
}
