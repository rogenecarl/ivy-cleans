import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import Breadcrumbs from "@/components/inner/Breadcrumbs";
import { breadcrumbs } from "@/data/breadcrumbs";
import { privacyPolicyMeta, privacyPolicyHeader, privacyPolicyParagraphs } from "@/data/privacy-policy";
import { cityFromParams, type CityParams } from "@/content/city-param";

export const metadata: Metadata = {
  title: privacyPolicyMeta.title,
  description: privacyPolicyMeta.description,
};

// post-3.css e217928: Source Serif Pro on live; Source Serif 4 is its successor on next/font
const sourceSerif = Source_Serif_4({ subsets: ["latin"] });

// post-3.css: band 9d0adbd (eyebrow ec288cf, h2 1dc107f, same steps as /faq); section 37e4d6b gradient #EEF7F4 13%,
// column 70bda86 white, 1px #86C6B0, 4px radius, padding 4.8rem / 2rem / 2em; text 1.8rem #000000CC
export default async function PrivacyPolicyPage({ params }: { params: CityParams }) {
  const c = await cityFromParams(params);
  return (
    <>
      <Breadcrumbs
        trail={breadcrumbs(c, { kind: "page", label: "Privacy Policy", path: "/privacy-policy" })}
      />
      <section className="bg-[#EEF7F4] pt-[2rem] pb-[1rem] md:pt-[3rem] md:pb-[2rem] lg:pt-[8.6rem] lg:pb-[3.8rem]">
        <div className="ec">
          <h3 className="text-rust mb-[1.5rem] text-[1.6rem] leading-[1.2em] font-semibold uppercase">
            {privacyPolicyHeader.overline}
          </h3>
          <h2 className="text-herogreen text-[2.5rem] leading-[1.2em] font-semibold md:text-[2.8rem] lg:text-[3.6rem]">
            {privacyPolicyHeader.h2}
          </h2>
        </div>
      </section>
      <section className="bg-[linear-gradient(180deg,#EEF7F4_13%,#FFFFFF_13%)] px-[1rem] pb-[3rem] md:pb-[4rem] lg:px-0 lg:pb-[9.6rem]">
        <div className="mx-auto max-w-[119rem]">
          <div
            className={`${sourceSerif.className} rounded-[4px] border border-[#86C6B0] bg-white p-[2em] text-[1.8rem] leading-[1.5em] text-[#000000CC] md:p-[2rem] lg:p-[4.8rem]`}
          >
            {privacyPolicyParagraphs.map((text) => (
              <p key={text.slice(0, 40)} className="mb-[2rem] last:mb-0">
                {text}
              </p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
