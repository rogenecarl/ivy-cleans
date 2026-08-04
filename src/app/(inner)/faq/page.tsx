import type { Metadata } from "next";
import Link from "next/link";
import { faqPageMeta, faqPageHeader } from "@/data/faq-page";
import FaqAccordion from "@/components/faq-page/FaqAccordion";

export const metadata: Metadata = {
  title: faqPageMeta.title,
  description: faqPageMeta.description,
};

/*
 * faq.html's two top-level sections after the shared header:
 *   #d51086c (#EEF7F4 band): eyebrow #16dcdd2 ("QUESTIONS", rust,
 *     1.6rem/600 uppercase, widget-container margin 0 0 -0.5rem 0) + h2
 *     #73c0ec6 ("Frequently Asked Questions", herogreen, 3.6rem/600
 *     desktop -> 2.8rem <=1024 -> 2.5rem <=767). Same padding steps
 *     (8.6rem/0/3.8rem/0 -> 3rem/0/2rem/0 -> 2rem/0/1rem/0) and eyebrow/H2
 *     pairing already used by /blog's heading section.
 *   #0a61e2d (two-stop gradient #EEF7F4 20% / #FFFFFF, padding
 *     0/0/9.6rem/0 -> 0/1rem/4rem/1rem -> 0/1rem/3rem/1rem): a single
 *     white, rounded (4px), #86C6B0-bordered column (#aafb91a, padding
 *     2.8rem 4.8rem 4.8rem 4.8rem -> 2rem 3rem 3rem 3rem -> 1rem 2rem
 *     2rem 2rem) holding the accordion (#664764d) then a small
 *     "Contact Us" button (#6e78442, href /contact, bg/border #397963,
 *     hover swaps to white bg + #397963 text, widget-container margin
 *     2rem 0 0 0 above it).
 */
export default function FaqPage() {
  return (
    <>
      <section className="bg-[#EEF7F4] pt-[2rem] pb-[1rem] md:pt-[3rem] md:pb-[2rem] lg:pt-[8.6rem] lg:pb-[3.8rem]">
        <div className="ec">
          <h3 className="text-rust mb-[1.5rem] text-[1.6rem] leading-[1.2em] font-semibold uppercase">
            {faqPageHeader.overline}
          </h3>
          <h2 className="text-herogreen text-[2.5rem] leading-[1.2em] font-semibold md:text-[2.8rem] lg:text-[3.6rem]">
            {faqPageHeader.h2}
          </h2>
        </div>
      </section>
      <section className="bg-[linear-gradient(180deg,#EEF7F4_20%,#FFFFFF_20%)] pb-[3rem] md:pb-[4rem] lg:pb-[9.6rem]">
        <div className="ec">
          <div className="rounded-[4px] border border-[#86C6B0] bg-white pt-[1rem] pr-[2rem] pb-[2rem] pl-[2rem] md:pt-[2rem] md:pr-[3rem] md:pb-[3rem] md:pl-[3rem] lg:pt-[2.8rem] lg:pr-[4.8rem] lg:pb-[4.8rem] lg:pl-[4.8rem]">
            <FaqAccordion />
            <Link
              href="/contact"
              className="mt-[2rem] inline-block rounded-[5px] border border-[#397963] bg-[#397963] px-[2.4rem] py-[1.1rem] text-[1.6rem] leading-[1.2em] font-bold text-white uppercase transition-colors hover:bg-white hover:text-[#397963]"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
