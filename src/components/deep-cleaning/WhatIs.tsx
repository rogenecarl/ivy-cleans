import Image from "next/image";
import type { DeepCleaningData } from "@/data/deep-cleaning";

/*
 * Section a759e86: padding 6rem 0 (3rem <=1024, 0/2rem <=767). This is a
 * TOP-LEVEL two-column row, so the column percentages are taken from the
 * elementor container (119rem = the .ec border box), not from .ec's content
 * box — hence the -mx-[10px] row and the px-[10px] "populated" wrappers,
 * which reproduce Elementor's default 10px column gutter exactly.
 * Columns measure 55.266%/44.697% at >=1024 (50/50 at 768-1024, stacked
 * below). The image widget (de9c0ac) carries margin-left -6.5rem above
 * 1280px, so the photo bleeds left of the container; the text column's
 * populated wrap (f1cdaa6) carries margin-left 4rem above 1024px.
 * Heading (4ce0b2c) left-aligned, 4.5/4/2.8rem, 1rem bottom margin at
 * desktop only; paragraph (c9c902e) left-aligned, 2/1.9/1.7rem font-light.
 */
export default function WhatIs({
  whatIs,
}: {
  whatIs: DeepCleaningData["whatIs"];
}) {
  /*
   * The live heading markup is `What is Deep <br> House Cleaning?` — a hard
   * break after the third word. Without it the line fits ("What is Deep
   * House" measures 380px against a 389px column) and the heading wraps one
   * word later than live, so the break is reproduced here rather than in the
   * data string, which stays byte-verbatim. The live theme hides every <br>
   * below 768px, so the break is suppressed at mobile and the heading wraps
   * naturally there.
   */
  const h2Words = whatIs.h2.split(" ");
  return (
    <section className="pt-0 pb-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <div className="-m-[10px] flex flex-wrap items-center">
          <div className="w-full md:w-[50%] lg:w-[55.266%]">
            <div className="p-[10px]">
              <div className="min-[1281px]:ml-[-6.5rem]">
                <Image
                  src={whatIs.image}
                  alt=""
                  width={770}
                  height={555}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
          <div className="w-full md:w-[50%] lg:w-[44.697%]">
            <div className="p-[10px] lg:ml-[4rem]">
              <h2 className="mb-[2rem] text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:mb-[3rem] lg:text-[4.5rem]">
                {h2Words.slice(0, 3).join(" ")} <br className="max-md:hidden" />
                {h2Words.slice(3).join(" ")}
              </h2>
              <div className="flow-root mb-[-2rem] lg:mb-0">
                <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
                  {whatIs.text}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
