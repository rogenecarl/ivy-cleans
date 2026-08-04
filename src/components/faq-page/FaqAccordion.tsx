"use client";

import { useState } from "react";
import { faqPageItems } from "@/data/faq-page";

/*
 * Page-scoped accordion for /faq (do not merge with the shared
 * src/components/Faq.tsx, which the front page still owns).
 *
 * live: faq.html's accordion (elementor-element-664764d, data-widget_type
 * "accordion.default") renders every elementor-tab-title with
 * aria-expanded="false" — none carries the `elementor-active` class Elementor
 * uses to mark a default-open item. So nothing is open on load here either,
 * matching Faq.tsx's front-page behavior (openIdx starts null).
 *
 * Indicator: the live markup uses an icon-right fa-chevron-down/up pair
 * (elementor-accordion-icon-closed/-opened), styled by post-36.css only for
 * color (#37745F). This repo has no Font Awesome/icon set installed (see
 * PostArticle.tsx's note on the same constraint), so — per the task brief's
 * explicit "+/− or the live indicator style" allowance — this reuses the
 * same +/− text indicator as the front page's Faq.tsx for consistency.
 *
 * post-36.css (elementor-element-664764d): accordion-title 1.8rem/600,
 * color #37745F; tab-title padding 1.2rem 0; tab-content padding
 * 2rem 0 0 0, color #000000CC, 1.8rem. The "Start custom CSS" block scopes
 * `.custom-faq .elementor-accordion-item` to a 1px #E5E7EB bottom border and
 * `.custom-faq .elementor-tab-content` to a 1px #E5E7EB top border — i.e. a
 * hairline rule between the title row and the open answer, and between
 * items.
 */
export default function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div>
      {faqPageItems.map((item, i) => (
        <div key={item.q} className="border-b border-[#E5E7EB] last:border-b-0">
          <button
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            aria-expanded={openIdx === i}
            className="flex w-full items-center justify-between gap-[2rem] py-[1.2rem] text-left"
          >
            <span className="text-herogreen text-[1.8rem] leading-[1.2em] font-semibold">
              {item.q}
            </span>
            <span className="text-herogreen shrink-0 text-[1.8rem] leading-none">
              {openIdx === i ? "−" : "+"}
            </span>
          </button>
          {openIdx === i && (
            <p className="border-t border-[#E5E7EB] pt-[2rem] pb-[1.2rem] text-[1.8rem] leading-[1.5em] text-[#000000CC]">
              {item.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
