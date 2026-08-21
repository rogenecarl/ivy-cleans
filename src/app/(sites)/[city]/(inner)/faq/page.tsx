import type { Metadata } from "next";
import Link from "next/link";
import { Source_Serif_4 } from "next/font/google";
import { faqPageMeta, faqPageHeader } from "@/data/faq-page";
import FaqAccordion from "@/components/faq-page/FaqAccordion";
import { cityFromParams, type CityParams } from "@/content/city-param";
import { cityHref } from "@/content/interpolate";

export const metadata: Metadata = {
  title: faqPageMeta.title,
  description: faqPageMeta.description,
};

/*
 * The accordion *answers* are the one place on the site that is not Poppins:
 * post-36.css sets `.elementor-tab-content{font-family:"Source Serif Pro",
 * Sans-serif}` and a live DOM probe confirms it actually renders (computed
 * font-family on the open answer is `"Source Serif Pro", sans-serif`, and the
 * live screenshot shows serifs). Google retired Source Serif Pro in favour of
 * its successor Source Serif 4 — that is the only member of the family
 * next/font/google still exposes, so it is what the clone self-hosts.
 * Declared here, page-scoped (next/font scopes a face to the component that
 * loads it), and handed to the accordion as a className: the shared root
 * layout keeps owning Poppins and no other page pays for this face.
 */
const sourceSerif = Source_Serif_4({ subsets: ["latin"] });

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
 *     2rem 2rem) holding the accordion (#664764d) then a small,
 *     center-aligned "Contact Us" button (#6e78442, href /contact, bg/border
 *     #397963, hover swaps to white bg + #397963 text). Its gap to the
 *     accordion is 4rem, not 2rem: the accordion widget's own 2rem bottom
 *     margin plus this widget-container's 2rem top margin. Live probe at
 *     1440: accordion ends y=562.5, button starts y=595.7 (33.2px = 4rem at
 *     root 8.32px); at 390 the same pair measures 665.9 -> 705.9 (40px =
 *     4rem at root 10px). The button is centered (x=652.5, w=134.9 in a
 *     1440 viewport -> centered on 720).
 */
export default async function FaqPage({ params }: { params: CityParams }) {
  // Copy on this page is entirely static; the city is only needed so the
  // "Contact Us" button stays inside a draft city's preview tree.
  const c = await cityFromParams(params);
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
      <section className="bg-[linear-gradient(180deg,#EEF7F4_20%,#FFFFFF_20%)] px-[1rem] pb-[3rem] md:pb-[4rem] lg:px-0 lg:pb-[9.6rem]">
        <div className="mx-auto max-w-[119rem]">
          <div className="rounded-[4px] border border-[#86C6B0] bg-white pt-[1rem] pr-[2rem] pb-[2rem] pl-[2rem] md:pt-[2rem] md:pr-[3rem] md:pb-[3rem] md:pl-[3rem] lg:pt-[2.8rem] lg:pr-[4.8rem] lg:pb-[4.8rem] lg:pl-[4.8rem]">
            <FaqAccordion answerClassName={sourceSerif.className} />
            <div className="mt-[4rem] text-center">
              <Link
                href={cityHref(c, "/contact")}
                className="inline-block rounded-[5px] border border-[#397963] bg-[#397963] px-[2.4rem] py-[1.1rem] text-[1.6rem] leading-[1.2em] font-bold text-white uppercase transition-colors hover:bg-white hover:text-[#397963]"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
