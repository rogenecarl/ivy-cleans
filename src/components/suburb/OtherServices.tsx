import Image from "next/image";
import Link from "next/link";
import { CheckItemIcon } from "@/components/Icons";
import type { SuburbData } from "@/data/suburb";

/*
 * Section 207a70b (post-664.css): deep-bg3.jpg (top center / no-repeat /
 * cover), padding 6/3/2rem — byte-identical to DeepServices.tsx's first
 * section. Heading (19bdefd1) centered white 4.5/4/2.8rem. Its OWN per-id
 * widget-container override is mb-0/lg:mb-[1rem], but — task-3 fidelity
 * pass finding — that number alone undercounts the live gap: post-6.css
 * (the kit) carries a page-wide `.elementor-widget:not(:last-child){margin-
 * block-end:2rem}` rule that applies to every Elementor widget with a
 * following sibling. For a heading followed by ANOTHER WIDGET (a flex
 * sibling in the same `.elementor-widget-wrap`, see HouseCleaning.tsx/
 * Benefits.tsx/Closing.tsx/SuburbHero.tsx), the visible gap is the MAX of
 * the two adjacent margins, not a sum. THIS heading's follower is instead
 * the plain row below (4481d252) — a container, not a widget, sitting
 * OUTSIDE that flex-wrap relationship — and for that case a live probe at
 * 1920/1440/1280/1025/768/390 shows the row's own margin-top (mt-0
 * md:mt-[1rem], unchanged, see below) genuinely ADDS to the heading's own
 * kit-plus-per-id total rather than being eclipsed by it. Rendered as
 * `mb-[2rem] md:mb-[3rem] lg:mb-[4rem]` (kit-2rem alone below md; +1rem
 * from the row's own margin-top from md up; +1rem more from this heading's
 * own per-id override from lg up).
 *
 * Inner section 4481d252: mt-0 md:mt-[1rem] (same value at md and lg, no
 * lg: override needed) — this is the row's OWN margin-top, ADDITIONAL to
 * the heading's fix above (see that fix's citation); already correct,
 * unchanged. Image column 7d12dfb7 (pb-[1rem] md:pr-[1rem] md:pb-0) is byte-identical
 * to DeepServices.tsx's own image column; the image itself is deep-img2.jpg
 * (586x613), the SAME file DeepServices.tsx renders for deep-cleaning's own
 * "Our Different Services" section — hardcoded here as a site-wide asset,
 * not per-suburb content. Widget 320da712 adds a genuine live-site quirk:
 * `img{height:329px}` (no media query — every width, confirmed unconditional
 * in post-664.css) plus `width:458px` (max-width, only below 1280px, on the
 * CONTAINER not the img). Reproduced as documented (not "fixed") per the
 * repo's convention for odd-but-real CSS (see WhatIs.tsx's forced <br>,
 * DeepServices.tsx's anomalous link-wrap): the image stays squashed to
 * 329px tall at EVERY width including xl+ (task-3 fidelity pass corrected
 * task-2's assumption that it "regains its natural aspect ratio at xl" — a
 * live probe at 1920/1440 shows the rendered <img> itself is still exactly
 * 329px tall there; only the max-width cap on its column lifts above
 * 1280px, letting the fixed-height image stretch wider than its intrinsic
 * 800:390 ratio would otherwise allow).
 *
 * Text column 3df54a87 (pt-[1rem] md:pt-0 md:pl-[1rem] lg:pl-[3rem]) is
 * byte-identical to DeepServices.tsx's own text column. Intro paragraph
 * (63667a00, "Other Services Offered In {suburb} Include:") is BOLD white.
 * Its wrapper's own per-id override is mb-[-2rem] lg:mb-0 (matches
 * DeepServices.tsx's listIntro style except for the wrapper sign, this
 * page's own convention) — plus the same not-last-child kit-floor fix as
 * Benefits.tsx's wrappers (its own follower, the icon-list, carries no
 * margin-top to eclipse it), rendered as `mb-0 lg:mb-[2rem]`.
 *
 * Icon-list 77ead619: white icon+text, padding-inline-end:1rem override
 * (unlike Benefits' 5fe2ef46 list, which has no such override) — the SAME
 * override DeepServices.tsx's own icon-list carries, reproduced with the
 * same gap-[1rem] row technique. Unlike DeepServices.tsx (where only ONE
 * item links out, a documented live special-case), EVERY item here is a
 * link — otherServices.links[] already carries a href per item from
 * suburbData(), so each <li> wraps its own <a>.
 */
export default function OtherServices({
  otherServices,
}: {
  otherServices: SuburbData["otherServices"];
}) {
  return (
    <section className="bg-[url(/images/deep-bg3.jpg)] bg-top bg-cover bg-no-repeat py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-white md:mb-[3rem] md:text-[4rem] lg:mb-[4rem] lg:text-[4.5rem]">
          {otherServices.heading}
        </h2>
        <div className="mt-0 flex flex-wrap items-center md:mt-[1rem]">
          <div className="w-full pb-[1rem] md:w-[50%] md:pr-[1rem] md:pb-0">
            <Image
              src="/images/deep-img2.jpg"
              alt=""
              width={586}
              height={613}
              className="h-[329px] w-full max-w-[458px] xl:max-w-none"
            />
          </div>
          <div className="w-full pt-[1rem] md:w-[50%] md:pt-0 md:pl-[1rem] lg:pl-[3rem]">
            <div className="flow-root mb-0 lg:mb-[2rem]">
              <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-bold text-white md:text-[1.9rem] lg:text-[2rem]">
                {otherServices.intro}
              </p>
            </div>
            <ul>
              {otherServices.links.map((link) => (
                <li key={link.label} className="mb-[1.5rem] last:mb-0">
                  <Link href={link.href} className="flex items-start gap-[1rem]">
                    <span className="mt-[1px] flex w-[2.125rem] shrink-0 md:w-[2.375rem] lg:w-[2.5rem]">
                      <CheckItemIcon className="h-[1.7rem] w-[1.7rem] text-white md:h-[1.9rem] md:w-[1.9rem] lg:h-[2rem] lg:w-[2rem]" />
                    </span>
                    <span className="text-[1.7rem] leading-[1.4em] font-light text-white md:text-[1.9rem] lg:text-[2rem]">
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
