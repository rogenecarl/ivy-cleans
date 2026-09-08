import Image from "next/image";
import Link from "next/link";
import type { ServiceContent } from "@/data/service-types";

// 6c3aa11: padding 6/3/2rem; heading 531e5f2; paragraphs + listIntro 4dbfd96 in one text widget.
// Qualities f2a8d5d/39d1f70/8a54988/02d6856: image boxes at 25% (100% below 768), icon margins 1.1/1.6/1/1rem.
// Closing section e130476: deep-bg5.jpg, white text; closing 3235761, contact 744c033 right-aligned on desktop, button eb13f95.
const qualityIconMargin = ["mb-[1.1rem]", "mb-[1.6rem]", "mb-[1rem]", "mb-[1rem]"];

export default function WhyChoose({
  whyChoose,
  bookHref,
}: {
  whyChoose: ServiceContent["whyChoose"];
  /* innerSite.bookUrl — "/book", or "/<cityKey>/book" inside a draft preview. */
  bookHref: string;
}) {
  return (
    <>
      <section className="py-[2rem] md:py-[3rem] lg:py-[6rem]">
        <div className="ec">
          <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:mb-[3rem] lg:text-[4.5rem]">
            {whyChoose.h2}
          </h2>
          <div className="flow-root mb-0 lg:mb-[2rem]">
            {whyChoose.paragraphs.map((p) => (
              <p
                key={p.slice(0, 40)}
                className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]"
              >
                {p}
              </p>
            ))}
            <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
              {whyChoose.listIntro}
            </p>
          </div>

          <div className="flex flex-wrap">
            {whyChoose.qualities.map((q, i) => (
              <div
                key={q.title}
                className={`w-full px-[1rem] text-center md:w-[25%] ${
                  i === whyChoose.qualities.length - 1 ? "mb-0 md:mb-[2rem]" : "mb-[2rem]"
                }`}
              >
                <figure className={`inline-block ${qualityIconMargin[i]}`}>
                  <Image src={q.icon} alt="" width={q.width} height={q.height} />
                </figure>
                <h3 className="mt-[0.5rem] mb-[10px] text-[2rem] leading-[1.2em] font-bold text-black">
                  {q.title}
                </h3>
                <p className="text-[1.4rem] leading-[1.5em] font-light text-black">{q.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[url(/images/deep-bg5.jpg)] bg-top bg-cover bg-no-repeat py-[2rem] md:py-[3rem] lg:py-[6rem]">
        <div className="ec">
          <h3 className="mb-[3rem] text-center text-[1.9rem] leading-[1.4em] font-light text-white md:text-[2rem] lg:text-[2.4rem]">
            {whyChoose.closing}
          </h3>
          <div className="flow-root mb-0 lg:mb-[2rem]">
            <p className="mb-[2rem] text-center text-[1.7rem] leading-[1.5em] font-light text-white md:text-[1.9rem] lg:text-right lg:text-[2rem]">
              {whyChoose.contact}
            </p>
          </div>
          <div className="text-center">
            <Link
              href={bookHref}
              className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white md:mt-[3rem] lg:mt-[1rem]"
            >
              Set an appointment 👈
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
