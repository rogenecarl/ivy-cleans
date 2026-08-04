import Image from "next/image";
import Link from "next/link";
import { CheckItemIcon } from "@/components/Icons";
import { benefits, benefitsBgImage } from "@/data/deep-cleaning";

/*
 * Section b30eca6 ("deep-sec03"): padding 6rem 0, heading (c019ab6)
 * centered 2.8/4/4.5rem, intro paragraphs (648bcac) left-aligned
 * 1.7/1.9/2rem font-light. NOTE: the live text-editor widget also contains
 * an injected Vavada Casino / beadspinnerstore.com spam paragraph between
 * the two real paragraphs and the list intro — deliberately excluded here.
 * Inner section 878b0c4 (50/50, 1rem gutters): left column carries the
 * listIntro + 5-item checklist (icon #5A8E00, text black); right column is
 * the deep-bg4.jpg image. Outro (11ebcf1) matches the intro paragraph
 * style; button (216a703) is centered with a 1rem top margin.
 */
export default function Benefits() {
  return (
    <section className="py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:text-[4.5rem]">
          {benefits.h2}
        </h2>
        {benefits.intro.map((p) => (
          <p
            key={p.slice(0, 40)}
            className="mb-[1rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]"
          >
            {p}
          </p>
        ))}

        <div className="mb-[4rem] flex flex-wrap items-center gap-y-[2rem]">
          <div className="w-full md:w-[50%] md:pr-[1rem]">
            <p className="mb-[1rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
              {benefits.listIntro}
            </p>
            <ul>
              {benefits.items.map((item) => (
                <li key={item} className="mb-[0.75rem] flex items-start gap-[1rem] last:mb-0">
                  <CheckItemIcon className="mt-[0.3rem] h-[1.4rem] w-[1.4rem] shrink-0 text-[#5A8E00]" />
                  <span className="text-[1.6rem] leading-[1.5em] text-black">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full md:w-[50%] md:pl-[1rem]">
            <Image
              src={benefitsBgImage}
              alt=""
              width={800}
              height={390}
              className="h-auto w-full"
            />
          </div>
        </div>

        <p className="text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
          {benefits.outro}
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
  );
}
