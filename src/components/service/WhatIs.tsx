import Image from "next/image";
import type { ServiceContent } from "@/data/service-types";
import Linked from "@/components/Linked";

// a759e86: padding 6rem/3rem/2rem; columns 55.266%/44.697% from 1024; image de9c0ac bleeds -6.5rem left above 1280;
// text wrap f1cdaa6 4rem left above 1024. Heading 4ce0b2c 4.5/4/2.8rem, paragraph c9c902e 2/1.9/1.7rem.
export default function WhatIs({
  whatIs,
}: {
  whatIs: ServiceContent["whatIs"];
}) {
  // live breaks the heading with a <br> after word N (whatIs.h2BreakAfter), hidden below 768 like the theme
  const breakAfter = whatIs.h2BreakAfter ?? 3;
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
                {h2Words.slice(0, breakAfter).join(" ")} <br className="max-md:hidden" />
                {h2Words.slice(breakAfter).join(" ")}
              </h2>
              <div className="flow-root mb-[-2rem] lg:mb-0">
                <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
                  {whatIs.text}
                </p>
                {/* the one per-city paragraph on a service page; same <p>, omitted when absent */}
                {whatIs.local && (
                  <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
                    <Linked text={whatIs.local} links={whatIs.localLinks} />
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
