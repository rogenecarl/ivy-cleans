import Image from "next/image";
import type { SuburbData } from "@/data/suburb";

// post-664.css 618aca1e: same section, columns (4973a706/55e99051 55.266%/44.697%) and deep-img1.jpg bleed as WhatIs.tsx.
// Heading b436479 mb 2rem/3rem (kit 2rem + own 1rem at lg); paragraph 5a58344c is the column's last widget, no kit floor.
export default function HouseCleaning({
  houseCleaning,
}: {
  houseCleaning: SuburbData["houseCleaning"];
}) {
  return (
    <section className="pt-0 pb-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <div className="-m-[10px] flex flex-wrap items-center">
          <div className="w-full md:w-[50%] lg:w-[55.266%]">
            <div className="p-[10px]">
              <div className="min-[1281px]:ml-[-6.5rem]">
                <Image
                  src="/images/deep-img1.jpg"
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
                {houseCleaning.heading}
              </h2>
              <div className="flow-root mb-[-2rem] lg:mb-0">
                <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
                  {houseCleaning.paragraph}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
