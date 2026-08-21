import Link from "next/link";
import type { SuburbData } from "@/data/suburb";

/*
 * Section 202a0f88 (post-664.css): deep-bg4.jpg (top center / no-repeat /
 * cover), padding pt 8/3/2rem, pb 60/24/11rem — byte-identical to
 * DeepServices.tsx's own closing section. Heading (7e11ad40) centered
 * font-light black 2.9/2.5/2rem. Its own per-id widget-container override is
 * mb-0/lg:mb-[1rem] (NOT DeepServices.tsx's implicit 2/3rem), but — task-3
 * fidelity pass finding, see suburb/OtherServices.tsx for the full citation
 * — that alone undercounts the live gap by post-6.css's kit-wide
 * `.elementor-widget:not(:last-child){margin-block-end:2rem}` rule.
 * Rendered as flat `mb-[2rem] lg:mb-[3rem]` (kit-2rem alone below lg;
 * kit-2rem + this widget's own 1rem at lg+), confirmed against a live probe
 * at every width. Paragraph (763de813) centered
 * font-light black 2/1.9/1.7rem. Its wrapper's own per-id override is
 * mb-[-2rem] lg:mb-0 (this page's consistent sign convention), plus the same
 * not-last-child kit-floor fix as Benefits.tsx's wrappers (the CTA button
 * below has only a 1rem margin-top at lg, smaller than the 2rem kit floor,
 * so it does not eclipse it), rendered as `mb-0 lg:mb-[2rem]`. Button
 * (2ea2c822) margin-top md:mt-[3rem] lg:mt-[1rem] — byte-identical to
 * DeepServices.tsx's own closing button, unchanged.
 */
export default function Closing({
  closing,
  bookHref,
}: {
  closing: SuburbData["closing"];
  /* innerSite.bookUrl — "/book", or "/<cityKey>/book" inside a draft preview. */
  bookHref: string;
}) {
  return (
    <section className="bg-[url(/images/deep-bg4.jpg)] bg-top bg-cover bg-no-repeat pt-[2rem] pb-[11rem] text-center md:pt-[3rem] md:pb-[24rem] lg:pt-[8rem] lg:pb-[60rem]">
      <div className="ec">
        <h3 className="mb-[2rem] text-[2rem] leading-[1.2em] font-light text-black md:text-[2.5rem] lg:mb-[3rem] lg:text-[2.9rem]">
          {closing.heading}
        </h3>
        <div className="flow-root mb-0 lg:mb-[2rem]">
          <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light text-black md:text-[1.9rem] lg:text-[2rem]">
            {closing.paragraph}
          </p>
        </div>
        {/* closing.ctaLabel present-but-unused — see SuburbHero.tsx's comment. */}
        <Link
          href={bookHref}
          className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white md:mt-[3rem] lg:mt-[1rem]"
        >
          Set an appointment 👈
        </Link>
      </div>
    </section>
  );
}
