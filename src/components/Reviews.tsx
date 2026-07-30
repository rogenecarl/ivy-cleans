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
        <div className="flex flex-col items-center gap-[16px] lg:flex-row lg:items-start">
          {/* summary header */}
          <div className="flex w-[270px] shrink-0 gap-[12px] p-[16px]">
            <Image
              src={reviews[0].avatar}
              alt=""
              width={46}
              height={46}
              className="h-[46px] w-[46px] shrink-0 rounded-full"
            />
            <div className="min-w-0">
              <a
                href={site.googleMapsUrl}
                target="_blank"
                rel="nofollow noopener"
                className="block text-[18px] leading-[25px] font-bold text-[#333]"
              >
                Ivy Cleans Minneapolis
              </a>
              <div className="mt-[8px] flex items-center gap-[6px]">
                <span className="text-[16px] font-black text-[#fb8e28]">{reviewsSummary.rating}</span>
                <Stars rating={reviewsSummary.rating} />
              </div>
              <div className="mt-[8px] text-[16px] text-[#555]">Based on {reviewsSummary.count} reviews</div>
              <div className="mt-[8px] text-[16px] font-semibold text-[#777]">
                powered by <GoogleWord />
              </div>
              <a
                href={site.writeReviewUrl}
                target="_blank"
                rel="nofollow noopener"
                className="mt-[8px] inline-block rounded-[27px] bg-[#1f67e7] px-[12px] pt-[4px] pb-[8px] text-[16px] text-white"
              >
                review us on Google
              </a>
            </div>
          </div>
          {/* slider */}
          <div className="flex w-full min-w-0 items-center gap-[8px]">
            <button
              onClick={prev}
              aria-label="Previous reviews"
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-[#ccc] bg-[#f5f5f5] text-[16px] text-[#374151]"
            >
              &lsaquo;
            </button>
            <div className="flex min-w-0 flex-1 gap-[6px]">
              {visible.map((r, i) => (
                <article
                  key={r.name}
                  className={`min-w-0 flex-1 bg-[#f4f4f4] p-[16px] ${i > 0 ? "hidden lg:block" : ""}`}
                >
                  <div className="flex items-start gap-[12px]">
                    <Image
                      src={r.avatar}
                      alt={`${r.name} profile picture`}
                      width={46}
                      height={46}
                      className="h-[46px] w-[46px] shrink-0 rounded-full"
                    />
                    <div className="min-w-0">
                      <a
                        href={r.profileUrl}
                        target="_blank"
                        rel="nofollow noopener"
                        className="block text-[16px] font-bold text-[#154fc1]"
                      >
                        {r.name}
                      </a>
                      <p className="text-[13px] text-[#555]">{r.time}</p>
                    </div>
                  </div>
                  <div className="mt-[10px]">
                    <Stars rating={r.rating} />
                  </div>
                  <p className="mt-[10px] line-clamp-4 text-[15px] leading-[25px] text-[#222]">{r.text}</p>
                </article>
              ))}
            </div>
            <button
              onClick={next}
              aria-label="Next reviews"
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-[#ccc] bg-[#f5f5f5] text-[16px] text-[#374151]"
            >
              &rsaquo;
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
