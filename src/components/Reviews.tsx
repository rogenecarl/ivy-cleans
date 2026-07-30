"use client";

import { useState } from "react";
import Image from "next/image";
import { reviews, reviewsSummary } from "@/data/reviews";
import { site } from "@/data/site";

function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? "#f8af0d" : "#d8d8d8"}>
          <path d="M12 2l2.9 6.26 6.6.63-5 4.45 1.5 6.66L12 16.9 5.9 20l1.5-6.66-5-4.45 6.6-.63L12 2z" />
        </svg>
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
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1140px] px-4">
        <h2 className="text-center text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
          What Our Satisfied Clients Are Saying
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <a href={site.googleMapsUrl} target="_blank" rel="nofollow noopener" className="font-bold">
              Ivy Cleans Minneapolis
            </a>
            <div className="flex items-center gap-2">
              <span className="text-[1.4rem] font-bold">{reviewsSummary.rating}</span>
              <Stars rating={reviewsSummary.rating} />
            </div>
            <p className="text-sm text-gray-600">Based on {reviewsSummary.count} reviews</p>
          </div>
          <a href={site.writeReviewUrl} target="_blank" rel="nofollow noopener" className="rounded bg-[#3c6df0] px-5 py-2.5 font-semibold text-white">
            review us on Google
          </a>
        </div>
        <div className="relative mt-8">
          <button onClick={prev} aria-label="Previous reviews" className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow">‹</button>
          <div className="grid gap-6 md:grid-cols-3">
            {visible.map((r, i) => (
              <article key={r.name} className={`rounded bg-[#fafafa] p-6 ${i > 0 ? "hidden md:block" : ""}`}>
                <div className="flex items-center gap-3">
                  <Image src={r.avatar} alt={`${r.name} profile picture`} width={50} height={50} className="rounded-full" />
                  <div>
                    <a href={r.profileUrl} target="_blank" rel="nofollow noopener" className="font-semibold">{r.name}</a>
                    <p className="text-sm text-gray-500">{r.time}</p>
                  </div>
                </div>
                <div className="mt-2"><Stars rating={r.rating} size={16} /></div>
                <p className="mt-3 line-clamp-6 text-sm leading-relaxed">{r.text}</p>
              </article>
            ))}
          </div>
          <button onClick={next} aria-label="Next reviews" className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 shadow">›</button>
        </div>
      </div>
    </section>
  );
}
