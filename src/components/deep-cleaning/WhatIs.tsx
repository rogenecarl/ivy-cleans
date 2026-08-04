import Image from "next/image";
import { whatIs } from "@/data/deep-cleaning";

/*
 * Section a759e86: padding 6rem 0 (3rem <=1024, 0/2rem <=767). Columns
 * measure 55.266%/44.697% at >=1024 (50/50 at 768-1024, stacked below).
 * Heading (4ce0b2c) left-aligned, 2.8/4/4.5rem; paragraph (c9c902e)
 * left-aligned, 1.7/1.9/2rem font-light.
 */
export default function WhatIs() {
  return (
    <section className="pt-0 pb-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec flex flex-wrap items-center gap-y-[2rem]">
        <div className="w-full md:w-[50%] lg:w-[55.266%]">
          <Image
            src={whatIs.image}
            alt=""
            width={770}
            height={555}
            className="h-auto w-full"
          />
        </div>
        <div className="w-full md:w-[50%] md:pl-[2rem] lg:w-[44.697%]">
          <h2 className="mb-[1rem] text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:text-[4.5rem]">
            {whatIs.h2}
          </h2>
          <p className="text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
            {whatIs.text}
          </p>
        </div>
      </div>
    </section>
  );
}
