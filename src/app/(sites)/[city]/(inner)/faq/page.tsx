import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/data/breadcrumbs";
import { Source_Serif_4 } from "next/font/google";
import { faqPageMeta, faqPageHeader } from "@/data/faq-page";
import FaqAccordion from "@/components/faq-page/FaqAccordion";
import { cityFromParams, type CityParams } from "@/content/city-param";
import { cityHref } from "@/content/interpolate";

export const metadata: Metadata = {
  title: faqPageMeta.title,
  description: faqPageMeta.description,
};

// post-36.css: accordion answers are Source Serif Pro on live; Source Serif 4 is its successor on next/font. Page-scoped.
const sourceSerif = Source_Serif_4({ subsets: ["latin"] });

// faq.html: band d51086c (eyebrow 16dcdd2, h2 73c0ec6, same padding steps as /blog); section 0a61e2d gradient #EEF7F4 20%,
// column aafb91a white, 4px radius, #86C6B0 border, padding 2.8rem 4.8rem 4.8rem / 2rem 3rem 3rem / 1rem 2rem 2rem;
// accordion 664764d then a centred Contact Us button 6e78442 (#397963), 4rem below the accordion.
export default async function FaqPage({ params }: { params: CityParams }) {
  // Copy on this page is entirely static; the city is only needed so the
  // "Contact Us" button stays inside a draft city's preview tree.
  const c = await cityFromParams(params);
  return (
    <>
      <Breadcrumbs trail={breadcrumbs(c, { kind: "page", label: "FAQ", path: "/faq" })} />
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
