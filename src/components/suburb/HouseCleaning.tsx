import Image from "next/image";
import type { SuburbData } from "@/data/suburb";

/*
 * Section 618aca1e (post-664.css): padding pt-0 pb-[2rem] md:py-[3rem]
 * lg:py-[6rem] — byte-identical to WhatIs.tsx's own section padding. Row
 * (no dedicated CSS id beyond the default 10px column gutter) is the same
 * -m-[10px] flex-wrap pattern WhatIs.tsx uses. Columns 4973a706/55e99051
 * measure 55.266%/44.697% at >=1025 and 50/50 at 768-1024 — identical
 * percentages to WhatIs.tsx's own two-column split. Image widget (5fc0950e)
 * carries margin-left -6.5rem above 1280px (0 below), same as WhatIs.tsx's
 * de9c0ac; the image itself (deep-img1.jpg, 770x555) is the SAME file
 * WhatIs.tsx renders — not per-suburb content, hardcoded here as it is there.
 * Text column (55e99051) carries margin-left 4rem above 1024px, same as
 * WhatIs.tsx. Heading (b436479) left-aligned 4.5/4/2.8rem. Its own per-id
 * widget-container override is mb-0/lg:mb-[1rem] (NOT WhatIs.tsx's 3rem),
 * but — task-3 fidelity pass finding, see OtherServices.tsx for the full
 * citation — that alone undercounts the live gap by post-6.css's kit-wide
 * `.elementor-widget:not(:last-child){margin-block-end:2rem}` rule.
 * Rendered as flat `mb-[2rem] lg:mb-[3rem]` (kit-2rem alone below lg;
 * kit-2rem + this widget's own 1rem at lg+), confirmed against a live probe
 * at every width. Paragraph (5a58344c) left-aligned font-light 2/1.9/1.7rem,
 * wrapper mb-[-2rem] lg:mb-0 (same sign convention WhatIs.tsx uses) — left
 * UNCHANGED, deliberately: unlike the heading above, this wrapper IS the
 * last widget in its column's wrap (nothing follows it), so post-6.css's
 * `:not(:last-child)` kit-floor rule does not apply to it at all (confirmed
 * live: no shortfall found here, contrast Benefits.tsx's analogous wrapper,
 * which DOES need the fix because it has a following sibling).
 */
export default function HouseCleaning({
  houseCleaning,
}: {
  houseCleaning: SuburbData["houseCleaning"];
}) {
  return (
    <section className="pt-0 pb-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <div className="-m-[10px] flex flex-wrap items-center">
          <div className="w-full md:w-[50%] lg:w-[55.266%]">
            <div className="p-[10px]">
              <div className="min-[1281px]:ml-[-6.5rem]">
                <Image
                  src="/images/deep-img1.jpg"
                  alt=""
                  width={770}
                  height={555}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </div>
          <div className="w-full md:w-[50%] lg:w-[44.697%]">
            <div className="p-[10px] lg:ml-[4rem]">
              <h2 className="mb-[2rem] text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:mb-[3rem] lg:text-[4.5rem]">
                {houseCleaning.heading}
              </h2>
              <div className="flow-root mb-[-2rem] lg:mb-0">
                <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
                  {houseCleaning.paragraph}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
