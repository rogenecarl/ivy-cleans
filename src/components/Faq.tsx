"use client";

import { useState } from "react";
import { faqs } from "@/data/faqs";

/*
 * Front-page-only accordion (the front page is the sole remaining caller —
 * /home now renders HomeFaqStatic instead — so the old items/subtitle/
 * questionsHeading props that only /home ever varied are gone).
 */
export default function Faq() {
  /*
   * Live RUNTIME state (post-JS probe at 1440 and 390): item 0 carries
   * `elementor-active` / aria-expanded="true" with its panel displayed, every other
   * item is closed. The static markup says otherwise — elementor's accordion JS
   * opens the first tab on load.
   */
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <section
      className="bg-cover bg-top pt-[1rem] md:py-[2rem] lg:py-[3rem]"
      style={{ backgroundImage: "url(/images/faq-bg.jpg)" }}
    >
      <div className="ec">
        {/* live: 824px column with elementor's 10px widget-wrap padding => 804px of content */}
        <div className="mx-auto max-w-[824px] lg:px-[10px]">
          {/* b8c7976: widget-container margin-bottom -1rem below 768px */}
          <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[2rem] md:text-[4rem] lg:text-[4.5rem]">
            Frequently Asked Questions
          </h2>
          {/* live 4542…: the intro paragraph keeps its own 2rem margin inside the
              text widget, so the gap to the accordion is 2x2rem (probe: 33.3px) */}
          <p className="mb-[2rem] text-center text-[1.7rem] leading-[1.5em] md:mb-[4rem] lg:text-[2.2rem]">
            If you need further assistance, please do not hesitate to contact us.
          </p>
          <div>
            {faqs.map((f, i) => (
              /* live accordion item: border-radius 10px, 2rem bottom margin */
              <div key={f.q} className="mb-[2rem] overflow-hidden rounded-[10px]">
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
                  /* live .elementor-tab-content: 0/2rem/2rem padding and a 5px
                     #D5D8DC bottom border */
                  <div className="border-b-[5px] border-[#d5d8dc] bg-white px-[2rem] pb-[2rem] text-[1.6rem] leading-[1.2em] font-light">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
