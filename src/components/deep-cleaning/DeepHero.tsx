import Link from "next/link";
import { deepHero } from "@/data/deep-cleaning";

/*
 * Section 1edd646 (post-245.css): deep-bg1.jpg (bottom center / no-repeat /
 * cover) with padding 6rem 0 50rem / 3rem 0 30rem / 2rem 0 18rem across
 * desktop / tablet / mobile — the outsized bottom padding is what exposes the
 * living-room art below the copy. h1 (ef6f308) is centered, uppercase,
 * herogreen, 7.2/4/3rem, and picks up a -2rem widget-container margin at
 * mobile only. Copy block (c79e633) is centered, max-w 106rem,
 * 2/1.9/1.7rem font-light; its paragraphs carry the theme's 2rem bottom
 * margin, which the widget-container's -2rem cancels at tablet. Button
 * (51884af) margin-top 3rem at desktop/tablet, 0 at mobile.
 */
export default function DeepHero() {
  return (
    <section className="bg-[url(/images/deep-bg1.jpg)] bg-bottom bg-cover bg-no-repeat pt-[2rem] pb-[18rem] text-center md:pt-[3rem] md:pb-[30rem] lg:pt-[6rem] lg:pb-[50rem]">
      <div className="ec">
        <h1 className="text-herogreen mb-0 text-[3rem] leading-[1.2em] font-bold uppercase md:mb-[2rem] md:text-[4rem] lg:text-[7.2rem]">
          {deepHero.h1}
        </h1>
        <div className="mx-auto max-w-[106rem] flow-root md:mb-[-2rem] lg:mb-0">
          {deepHero.paragraphs.map((p) => (
            <p
              key={p.slice(0, 40)}
              className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]"
            >
              {p}
            </p>
          ))}
        </div>
        <Link
          href="/book"
          className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white md:mt-[3rem]"
        >
          Set an appointment 👈
        </Link>
      </div>
    </section>
  );
}
