import { CheckItemIcon } from "@/components/Icons";
import { included } from "@/data/move-out";

/*
 * Section 86d3a37 (post-241.css): out-bg2.jpg (no-repeat / cover),
 * positioned top center above 767px and top right at mobile. Padding
 * 6rem/9rem (desktop top/bottom), 3rem/3rem tablet, 2rem/2rem mobile.
 * Heading (ebc9f75) centered black, 4.5/4/2.8rem, 2rem bottom margin at
 * desktop only. The column (c71099b) sets justify-content:flex-end on its
 * widget-wrap, so the 50%-wide checklist (54c1f4f, 65% tablet / 100%
 * mobile) is pushed to the RIGHT of the container, leaving the art visible
 * on the left. Items 2/1.9/1.7rem font-light black at line-height 1.4em,
 * icon color #4D9682 with a 0.5rem icon padding (rather than the 8px
 * default), 2.5rem between items and --icon-vertical-offset 4px.
 */
export default function IncludedServices() {
  return (
    <section className="bg-[url(/images/out-bg2.jpg)] bg-[position:top_right] bg-cover bg-no-repeat pt-[2rem] pb-[2rem] md:bg-top md:pt-[3rem] md:pb-[3rem] lg:pt-[6rem] lg:pb-[9rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:mb-[4rem] lg:text-[4.5rem]">
          {included.h2}
        </h2>
        <ul className="ml-auto md:w-[65%] lg:w-[50%]">
          {included.items.map((item) => (
            <li
              key={item}
              className="mb-[2.5rem] flex items-start gap-[0.5rem] last:mb-0"
            >
              <span className="mt-[4px] flex w-[2.125rem] shrink-0 md:w-[2.375rem] lg:w-[2.5rem]">
                <CheckItemIcon className="h-[1.7rem] w-[1.7rem] text-[#4D9682] md:h-[1.9rem] md:w-[1.9rem] lg:h-[2rem] lg:w-[2rem]" />
              </span>
              <span className="text-[1.7rem] leading-[1.4em] font-light text-black md:text-[1.9rem] lg:text-[2rem]">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
