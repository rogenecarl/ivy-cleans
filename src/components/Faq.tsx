"use client";

import { useState } from "react";
import { faqs } from "@/data/faqs";

/*
 * Front-page-only accordion (the front page is the sole remaining caller —
 * /home now renders HomeFaqStatic instead — so the old items/subtitle/
 * questionsHeading props that only /home ever varied are gone).
 */
export default function Faq() {
  /* live: every accordion item renders with aria-expanded="false" — nothing is open on load */
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section
      className="bg-cover bg-top pt-[1rem] md:py-[2rem] lg:py-[3rem]"
      style={{ backgroundImage: "url(/images/faq-bg.jpg)" }}
    >
      <div className="ec">
        {/* live: 824px column with elementor's 10px widget-wrap padding => 804px of content */}
        <div className="mx-auto max-w-[824px] lg:px-[10px]">
          <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
            Frequently Asked Questions
          </h2>
          <p className="mb-[2rem] text-center text-[1.7rem] leading-[1.5em] lg:text-[2.2rem]">
            If you need further assistance, please do not hesitate to contact us.
          </p>
          <div>
            {faqs.map((f, i) => (
              <div key={f.q} className="mb-[2rem] overflow-hidden rounded-[1.2rem]">
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  aria-expanded={openIdx === i}
                  className="flex w-full items-center justify-between gap-[2rem] bg-white p-[2rem] text-left"
                >
                  <span className="text-brand text-[1.8rem] leading-[1.2em] font-semibold md:text-[2rem]">
                    {f.q}
                  </span>
                  <span className="text-brand shrink-0 text-[1.6rem] leading-none">
                    {openIdx === i ? "−" : "+"}
                  </span>
                </button>
                {openIdx === i && (
                  <p className="border-brand border-b-[0.6rem] bg-white px-[2rem] pb-[2rem] text-[1.6rem] leading-[1.2em] font-light">
                    {f.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
