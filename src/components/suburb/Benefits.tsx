import Image from "next/image";
import Link from "next/link";
import { CheckItemIcon } from "@/components/Icons";
import type { SuburbData } from "@/data/suburb";

/*
 * Section 6890e115 (post-664.css): deep-bg2.jpg with no position/size/repeat
 * override (CSS defaults 0 0 / auto / repeat) — byte-identical to
 * deep-cleaning's Benefits.tsx section. Padding 6/3/2rem symmetric. Heading
 * (156617a3) centered 4.5/4/2.8rem. Its own per-id widget-container override
 * is mb-0/lg:mb-[1rem] (NOT deep-cleaning Benefits.tsx's 3rem), but — task-3
 * fidelity pass finding, see suburb/OtherServices.tsx for the full citation
 * — that alone undercounts the live gap by post-6.css's kit-wide
 * `.elementor-widget:not(:last-child){margin-block-end:2rem}` rule.
 * Rendered as flat `mb-[2rem] lg:mb-[3rem]` (kit-2rem alone below lg;
 * kit-2rem + this widget's own 1rem at lg+), confirmed against a live probe
 * at every width. Intro paragraphs
 * (6abbf289, both dump paragraphs in one text-editor widget) left-aligned
 * font-light 2/1.9/1.7rem. The wrapper's own per-id override is mb-[-2rem]
 * lg:mb-0 (every text-editor wrapper on THIS page uses that sign, opposite
 * of deep-cleaning's page) — but this wrapper is ALSO a not-last-child
 * widget (its own kit-block-end applies, same mechanism as the heading
 * above; unlike SuburbHero.tsx's copy-block, whose own kit floor is
 * eclipsed by a LARGER following sibling margin and so needed no fix, this
 * wrapper's own follower — the plain row below — has margin-top:0, so the
 * kit floor is NOT eclipsed and shows through). Rendered as `mb-0
 * lg:mb-[2rem]` (net of -2rem/0 own-override + kit-2rem), confirmed live.
 *
 * Inner section 757efb0b: mb-[2rem] md:mb-[4rem] — byte-identical to
 * deep-cleaning Benefits.tsx's own two-column row. Left column 49b8f61d
 * (pb-[1rem] md:pr-[1rem] md:pb-0) carries listIntro (64c5b3f0, same
 * "mb-0 lg:mb-[2rem]" fix as above — its own follower, the icon-list, also
 * carries no margin-top of its own to eclipse the kit floor) + icon-list
 * 5fe2ef46 — green #5A8E00, no padding-inline-end override, so the li
 * markup matches deep-cleaning Benefits.tsx's exactly (icon-box spacing
 * only, no extra gap). Right column 40ad43ca (pt-[1rem] md:pt-0
 * md:pl-[1rem]) carries the image — deep-bg4.jpg, same asset
 * deep-cleaning.ts uses for benefitsBgImage, hardcoded here since it is a
 * site-wide constant, not per-suburb content.
 *
 * Closing paragraph (55addc2b) matches the intro paragraphs' style/wrapper,
 * including the same kit-floor fix (its own follower, the CTA button below,
 * has only a 1rem margin-top at lg — smaller than the 2rem kit floor, so it
 * does not eclipse it either).
 * Middle CTA button (2e17d4a5, dump line 34 — flagged in task-1's handoff
 * notes as not its own SuburbData field): margin-top lg:mt-[1rem] only
 * (0 at md/mobile), byte-identical to deep-cleaning Benefits.tsx's own
 * button. Reuses the same hardcoded "Set an appointment 👈" text as the hero
 * and closing CTAs — same convention, not threaded through ctaLabel.
 */
export default function Benefits({
  benefits,
  bookHref,
}: {
  benefits: SuburbData["benefits"];
  /* innerSite.bookUrl — "/book", or "/<cityKey>/book" inside a draft preview. */
  bookHref: string;
}) {
  return (
    <section className="bg-[url(/images/deep-bg2.jpg)] py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:mb-[3rem] lg:text-[4.5rem]">
          {benefits.heading}
        </h2>
        <div className="flow-root mb-0 lg:mb-[2rem]">
          {benefits.paragraphs.map((p) => (
            <p
              key={p.slice(0, 40)}
              className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]"
            >
              {p}
            </p>
          ))}
        </div>

        <div className="mb-[2rem] flex flex-wrap items-start md:mb-[4rem]">
          <div className="w-full pb-[1rem] md:w-[50%] md:pr-[1rem] md:pb-0">
            <div className="flow-root mb-0 lg:mb-[2rem]">
              <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
                {benefits.listIntro}
              </p>
            </div>
            <ul>
              {benefits.items.map((item) => (
                <li key={item} className="mb-[1.5rem] flex items-start last:mb-0">
                  <span className="mt-[1px] flex w-[2.125rem] shrink-0 md:w-[2.375rem] lg:w-[2.5rem]">
                    <CheckItemIcon className="h-[1.7rem] w-[1.7rem] text-[#5A8E00] md:h-[1.9rem] md:w-[1.9rem] lg:h-[2rem] lg:w-[2rem]" />
                  </span>
                  <span className="text-[1.7rem] leading-[1.4em] font-light text-black md:text-[1.9rem] lg:text-[2rem]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full pt-[1rem] md:w-[50%] md:pt-0 md:pl-[1rem]">
            <Image
              src="/images/deep-bg4.jpg"
              alt=""
              width={800}
              height={390}
              className="h-auto w-full"
            />
          </div>
        </div>

        <div className="flow-root mb-0 lg:mb-[2rem]">
          <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
            {benefits.closing}
          </p>
        </div>

        <div className="text-center">
          <Link
            href={bookHref}
            className="bg-rust border-rust hover:text-rust inline-block lg:mt-[1rem] rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white"
          >
            Set an appointment 👈
          </Link>
        </div>
      </div>
    </section>
  );
}
