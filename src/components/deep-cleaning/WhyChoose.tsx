import Image from "next/image";
import Link from "next/link";
import type { DeepCleaningData } from "@/data/deep-cleaning";

/*
 * Section 6c3aa11: padding 6/3/2rem. Heading (531e5f2) centered black,
 * 4.5/4/2.8rem with a 1rem bottom margin at desktop only. The two paragraphs
 * + listIntro (4dbfd96) share one left-aligned, font-light 2/1.9/1.7rem
 * text-editor, so they carry the theme's 2rem paragraph margin and the
 * widget's -2rem cancel below 1024px.
 *
 * The 4 qualities (f2a8d5d/39d1f70/8a54988/02d6856) are image-box widgets at
 * width 25% (100% below 768px — there is no 50% tablet step on the live
 * page), each with a 2rem widget bottom margin and 1rem side padding.
 * Their icon bottom margins differ per widget (1.1 / 1.6 / 1 / 1rem), and
 * the last widget drops its bottom margin at mobile. Title 2rem/700/black
 * with a 10px bottom margin, description 1.4rem/300/black.
 *
 * Section e130476 (closing/contact/CTA) carries deep-bg5.jpg (top center /
 * no-repeat / cover) behind white text, padding 6/3/2rem. Closing (3235761)
 * is centered white 2.4/2/1.9rem font-light at line-height 1.4em. Contact
 * (744c033) is right-aligned on desktop, centered on tablet/mobile. Button
 * (eb13f95) top margin 1rem desktop / 3rem tablet / 0 mobile.
 */
const qualityIconMargin = ["mb-[1.1rem]", "mb-[1.6rem]", "mb-[1rem]", "mb-[1rem]"];

export default function WhyChoose({
  whyChoose,
  bookHref,
}: {
  whyChoose: DeepCleaningData["whyChoose"];
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
