"use client";

import { useState } from "react";
import Image from "next/image";
import { workImages } from "@/data/home";
import { ChevronRightIcon } from "@/components/Icons";

export default function WorkCarousel() {
  const [index, setIndex] = useState(0);
  const prev = () => setIndex((i) => (i - 1 + workImages.length) % workImages.length);
  const next = () => setIndex((i) => (i + 1) % workImages.length);

  return (
    <section className="bg-white py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          Our Cleaning Work In Action
        </h2>
        <div className="mx-auto flex max-w-[80rem] items-center gap-[1rem]">
          <button
            onClick={prev}
            aria-label="Previous image"
            className="flex h-[3.4rem] w-[3.4rem] shrink-0 items-center justify-center rounded-full border border-[#ccc] bg-[#f5f5f5]"
          >
            <ChevronRightIcon className="h-[1.6rem] w-[1.6rem] rotate-180" />
          </button>
          <div className="min-w-0 flex-1">
            <Image
              src={workImages[index]}
              alt=""
              width={800}
              height={600}
              className="h-auto w-full"
            />
          </div>
          <button
            onClick={next}
            aria-label="Next image"
            className="flex h-[3.4rem] w-[3.4rem] shrink-0 items-center justify-center rounded-full border border-[#ccc] bg-[#f5f5f5]"
          >
            <ChevronRightIcon className="h-[1.6rem] w-[1.6rem]" />
          </button>
        </div>
      </div>
    </section>
  );
}
