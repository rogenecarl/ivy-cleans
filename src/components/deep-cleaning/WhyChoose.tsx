import Image from "next/image";
import Link from "next/link";
import { whyChoose } from "@/data/deep-cleaning";

/*
 * Section 6c3aa11: padding 2/3/6rem. Heading (531e5f2) centered black,
 * 2.8/4/4.5rem. The two paragraphs + listIntro (4dbfd96) share one
 * left-aligned, font-light 1.7/1.9/2rem block. The 4 qualities
 * (f2a8d5d/39d1f70/8a54988/02d6856) are 25%-wide image-box widgets
 * (100% at <767px) — title 2rem/700/black, description 1.4rem/300/black,
 * matching the generic .elementor-image-box-* rules used by Features.tsx.
 *
 * Section e130476 (closing/contact/CTA) carries a deep-bg5.jpg background
 * (not in the round-3 asset set) with white text; herogreen stands in as a
 * placeholder dark background until Task 4 adds the real image. Closing
 * (3235761) is centered white, a fixed 2.4rem/1.4em (no responsive
 * override on the live page). Contact (744c033) is right-aligned on
 * desktop, centered on tablet/mobile.
 */
export default function WhyChoose() {
  return (
    <>
      <section className="py-[2rem] md:py-[3rem] lg:py-[6rem]">
        <div className="ec">
          <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:text-[4.5rem]">
            {whyChoose.h2}
          </h2>
          {whyChoose.paragraphs.map((p) => (
            <p
              key={p.slice(0, 40)}
              className="mb-[1rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]"
            >
              {p}
            </p>
          ))}
          <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
            {whyChoose.listIntro}
          </p>

          <div className="flex flex-wrap gap-y-[2rem]">
            {whyChoose.qualities.map((q) => (
              <div key={q.title} className="w-full px-[1rem] text-center md:w-1/2 lg:w-1/4">
                <Image
                  src={q.icon}
                  alt=""
                  width={q.width}
                  height={q.height}
                  className="mx-auto h-auto w-auto"
                />
                <h3 className="mt-[1rem] mb-[10px] text-[2rem] leading-[1.2em] font-bold text-black">
                  {q.title}
                </h3>
                <p className="text-[1.4rem] leading-[1.5em] font-light text-black">{q.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-herogreen py-[2rem] md:py-[3rem] lg:py-[6rem]">
        <div className="ec">
          <h3 className="mb-[1rem] text-center text-[2.4rem] leading-[1.4em] font-light text-white">
            {whyChoose.closing}
          </h3>
          <p className="text-center text-[1.7rem] leading-[1.5em] font-light text-white md:text-[1.9rem] lg:text-right lg:text-[2rem]">
            {whyChoose.contact}
          </p>
          <div className="mt-[1rem] text-center">
            <Link
              href="/book"
              className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white"
            >
              Set an appointment 👈
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
