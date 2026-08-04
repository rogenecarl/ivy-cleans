"use client";

import { useState } from "react";
import Image from "next/image";
import { workImages } from "@/data/home";
import { ChevronRightIcon } from "@/components/Icons";

/*
 * Section 3eef65e is an Elementor image-carousel, not a single-image viewer.
 * Live @1440 the track measures 1185px centred (slides at x=128/523/918, each
 * 395x296) and @390 it is the container's own 370px with one slide — i.e.
 * three slides per view on desktop, one on mobile, 4:3 art either way. The
 * section measures 395px tall at both widths: 32/42px above the slides and
 * 67/75px of pagination space below.
 */
const PER_VIEW_CLASS = "w-full md:w-1/2 lg:w-1/3";

export default function WorkCarousel() {
  const [index, setIndex] = useState(0);
  const prev = () => setIndex((i) => (i - 1 + workImages.length) % workImages.length);
  const next = () => setIndex((i) => (i + 1) % workImages.length);

  return (
    <section className="bg-white">
      <div className="ec">
        <h2 className="text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[1rem] md:text-[4rem] lg:text-[4.5rem]">
          Our Cleaning Work In Action
        </h2>
      </div>
      <div className="relative mx-auto max-w-[390px] px-[10px] pt-[42px] pb-[75px] md:max-w-[790px] lg:max-w-[1185px] lg:px-0 lg:pt-[32px] lg:pb-[67px]">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {workImages.map((src) => (
              <div key={src} className={`${PER_VIEW_CLASS} shrink-0`}>
                <Image
                  src={src}
                  alt=""
                  width={800}
                  height={600}
                  className="aspect-[395/296] w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={prev}
          aria-label="Previous image"
          className="absolute top-1/2 left-[-1.5rem] flex h-[3.4rem] w-[3.4rem] -translate-y-1/2 items-center justify-center text-[#3f444b]"
        >
          <ChevronRightIcon className="h-[1.8rem] w-[1.8rem] rotate-180" />
        </button>
        <button
          onClick={next}
          aria-label="Next image"
          className="absolute top-1/2 right-[-1.5rem] flex h-[3.4rem] w-[3.4rem] -translate-y-1/2 items-center justify-center text-[#3f444b]"
        >
          <ChevronRightIcon className="h-[1.8rem] w-[1.8rem]" />
        </button>
      </div>
    </section>
  );
}
