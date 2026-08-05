"use client";

import { useState } from "react";
import Image from "next/image";
import { reviews, reviewsSummary } from "@/data/reviews";
import { site } from "@/data/site";

/* the live Google-reviews widget renders at fixed px sizes, so this snapshot
   deliberately uses px rather than the rem scale of the rest of the page */

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? "#fb8e28" : "#d8d8d8"}
        >
          <path d="M12 2l2.9 6.26 6.6.63-5 4.45 1.5 6.66L12 16.9 5.9 20l1.5-6.66-5-4.45 6.6-.63L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function GoogleWord() {
  const letters: [string, string][] = [
    ["G", "#3c6df0"],
    ["o", "#d93025"],
    ["o", "#fb8e28"],
    ["g", "#3c6df0"],
    ["l", "#188038"],
    ["e", "#d93025"],
  ];
  return (
    <span className="font-semibold">
      {letters.map(([c, col], i) => (
        <span key={i} style={{ color: col }}>
          {c}
        </span>
      ))}
    </span>
  );
}

export default function Reviews() {
  const [start, setStart] = useState(0);
  const prev = () => setStart((s) => (s - 1 + reviews.length) % reviews.length);
  const next = () => setStart((s) => (s + 1) % reviews.length);
  const visible = [0, 1, 2].map((o) => reviews[(start + o) % reviews.length]);

  return (
    <section className="bg-[#fafafa] py-[1rem] md:py-[2rem] lg:py-[5rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          What Our Satisfied Clients Are Saying
        </h2>
        {/*
          Live `.wp-gr` sets font-size:16px / line-height:normal on the widget root;
          without that the widget inherits globals.css `body{line-height:1.5em}`,
          which computes to a fixed 12.48px and shrinks every line box inside.
          `.grw-row` is a flex row (column below 768px) with 16px bottom padding.
        */}
        <div className="flex flex-col pb-[16px] text-[16px] leading-[25px] lg:flex-row lg:items-center">
          {/* .grw-header — 25% of the widget width; .grw-header-inner: margin 4,
              padding 16, gap 12, column gap 8 */}
          <div className="shrink-0 lg:w-1/4">
            {/* live .grw-header-inner keeps its full 269.5px width despite the 4px
                margin (it overflows the header), so only the vertical margin counts */}
            <div className="my-[4px] ml-[4px] flex w-full gap-[12px] p-[16px]">
              <Image
                src={reviews[0].avatar}
                alt=""
                width={46}
                height={46}
                className="h-[46px] w-[46px] shrink-0 rounded-full"
              />
              <div className="flex min-w-0 flex-col gap-[8px]">
                <div className="text-[#333]">
                  <a
                    href={site.googleMapsUrl}
                    target="_blank"
                    rel="nofollow noopener"
                    className="text-[18px] leading-[21.6px] text-[#333]"
                  >
                    Ivy Cleans Minneapolis
                  </a>
                </div>
                <span className="flex h-[20px] items-center font-black text-[#fb8e28]">
                  {reviewsSummary.rating}
                  <Stars rating={reviewsSummary.rating} />
                </span>
                <div className="text-[#555]">Based on {reviewsSummary.count} reviews</div>
                <div className="font-semibold text-[#777]">
                  powered by <GoogleWord />
                </div>
                {/* .wp-google-wr is display:flex, so the pill does not add an
                    inline-block descender to the column */}
                <div className="flex">
                  <a
                    href={site.writeReviewUrl}
                    target="_blank"
                    rel="nofollow noopener"
                    className="inline-block rounded-[27px] bg-[#1f67e7] px-[12px] pt-[4px] pb-[8px] leading-[19.2px] whitespace-nowrap text-white shadow-[0_0_2px_0_rgba(0,0,0,0.12),0_2px_4px_0_rgba(0,0,0,0.24)]"
                  >
                    review us on Google
                  </a>
                </div>
              </div>
            </div>
          </div>
          {/* .rpi-slides-root — 75% of the widget width, the 34px arrows sitting in
              the 17px inline margin of .rpi-slides */}
          {/* the 34px arrows overlay the 17px inline margin of .rpi-slides rather
              than taking width from it */}
          <div className="relative flex w-full min-w-0 items-center lg:w-3/4">
            <button
              onClick={prev}
              aria-label="Previous reviews"
              className="absolute left-0 z-10 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-[#ccc] bg-[#f5f5f5] text-[#374151] shadow-[0_2px_6px_0_rgba(0,0,0,0.15)]"
            >
              &lsaquo;
            </button>
            <div className="mx-[17px] flex min-w-0 flex-1 gap-[4px]">
              {visible.map((r, i) => (
                /* .rpi-slide: 4px/3px padding; .grw-review-inner: margin 4,
                   padding 16, gap 12, #f4f4f4 */
                <article
                  key={r.name}
                  className={`h-[238px] min-w-0 flex-1 px-[3px] py-[4px] ${i > 0 ? "hidden lg:block" : ""}`}
                >
                  <div className="mx-[4px] flex h-full flex-col gap-[12px] bg-[#f4f4f4] p-[16px]">
                    <div className="flex items-center gap-[12px]">
                      <Image
                        src={r.avatar}
                        alt={`${r.name} profile picture`}
                        width={46}
                        height={46}
                        className="h-[46px] w-[46px] shrink-0 rounded-full"
                      />
                      <div className="flex min-w-0 flex-col gap-[6px]">
                        <a
                          href={r.profileUrl}
                          target="_blank"
                          rel="nofollow noopener"
                          className="block leading-[19.2px] font-bold text-[#154fc1]"
                        >
                          {r.name}
                        </a>
                        <div className="text-[13px] leading-[20px] text-[#555]">{r.time}</div>
                      </div>
                    </div>
                    <span className="flex h-[20px] items-center">
                      <Stars rating={r.rating} />
                    </span>
                    {/* live clips the review to a 100px scroll box rather than
                        clamping it to a line count */}
                    <div className="h-[100px] overflow-hidden">
                      <span className="text-[15px] leading-[24px] text-[#222]">{r.text}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <button
              onClick={next}
              aria-label="Next reviews"
              className="absolute right-0 z-10 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-[#ccc] bg-[#f5f5f5] text-[#374151] shadow-[0_2px_6px_0_rgba(0,0,0,0.15)]"
            >
              &rsaquo;
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
