"use client";

import { useState } from "react";
import { faqPageItems } from "@/data/faq-page";
import { ChevronRightIcon } from "@/components/Icons";

// /faq accordion (not the front page's Faq.tsx). Opens on item 0 like live. Chevron at 1.5rem stands in for the
// uncaptured Font Awesome glyph. post-36.css 664764d: title 1.2rem 0, link 1.8rem/600 #37745F; content 2rem top,
// 1.8rem/1.5em Source Serif; 1px #E5E7EB rules.
export default function FaqAccordion({
  answerClassName = "",
}: {
  answerClassName?: string;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div>
      {faqPageItems.map((item, i) => (
        <div key={item.q} className="border-b border-[#E5E7EB]">
          <button
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            aria-expanded={openIdx === i}
            className="flex w-full items-center justify-between gap-[0.5rem] py-[1.2rem] text-left"
          >
            <span className="text-herogreen text-[1.8rem] leading-[1.2em] font-semibold">
              {item.q}
            </span>
            <ChevronRightIcon
              className={`text-herogreen h-[1.5rem] w-[1.5rem] shrink-0 ${
                openIdx === i ? "-rotate-90" : "rotate-90"
              }`}
            />
          </button>
          {openIdx === i && (
            <p
              className={`border-t border-[#E5E7EB] pt-[2rem] pb-[2rem] text-[1.8rem] leading-[1.5em] text-[#000000CC] ${answerClassName}`}
            >
              {item.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
