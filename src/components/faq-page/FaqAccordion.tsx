"use client";

import { useState } from "react";
import { faqPageItems } from "@/data/faq-page";
import { ChevronRightIcon } from "@/components/Icons";

/*
 * Page-scoped accordion for /faq (do not merge with the shared
 * src/components/Faq.tsx, which the front page still owns).
 *
 * Default-open item: the *static* faq.html markup ships every
 * elementor-tab-title with aria-expanded="false", but that is only the
 * pre-hydration state — Elementor's accordion JS activates its first tab on
 * load. A live DOM probe settles it: on arrival item 0 measures 118.1px tall
 * with its tab-content laid out (y=326.7, h=62.5) while items 1-4 measure
 * 38.9px with display:none content; clicking item 0's title collapses it and
 * every item then measures 38.9px. So this clone opens on index 0. (The front
 * page's Faq.tsx is a different widget and keeps its own null default.)
 *
 * Indicator: the live markup uses an icon-right fa-chevron-down/up pair
 * (elementor-accordion-icon-closed/-opened) that post-36.css styles only for
 * color (#37745F); the glyph itself lives in an uncaptured Font Awesome
 * stylesheet and this repo has no icon font. The probe measures that glyph's
 * box at 12.5x8.3 at 1440, so the closest thing already in the repo — the
 * shared ChevronRightIcon, rotated a quarter turn — stands in at 1.5rem
 * (12.48px) square, pointing down when closed and up when open. Read-only
 * import; Icons.tsx is untouched. Its flex gap is 0.5rem, not the 2rem a
 * heading pair would take: live the icon is a float:right span that only
 * narrows the first line, so at 390 the 328px-wide title row still fits
 * "Do you accept online bookings?" on one line (measured title height 45.6 =
 * one 21.6px line + 2x12px padding). A 2rem gap wrapped it to two.
 *
 * post-36.css (elementor-element-664764d) + live probe at 1440 (root
 * 8.32px): tab-title padding 1.2rem 0 (9.984px), its <a> 1.8rem/600
 * (14.976px) #37745F at 1.2em; tab-content padding 2rem 0 0 0 (16.64px) with
 * the inner <p> carrying its own 2rem bottom margin, 1.8rem/1.5em
 * (22.464px), color #000000CC, in Source Serif (see faq/page.tsx). The
 * "Start custom CSS" block scopes `.custom-faq .elementor-accordion-item` to
 * a 1px #E5E7EB bottom border — present on the last item too, so no
 * `last:border-b-0` — and `.custom-faq .elementor-tab-content` to a 1px
 * #E5E7EB top border.
 */
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
