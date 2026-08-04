import Link from "next/link";
import { deepHero } from "@/data/deep-cleaning";

/*
 * Section 1edd646 (post-245.css): h1 (ef6f308) is centered, uppercase,
 * herogreen, 3/4/7.2rem across mobile/tablet/desktop. Copy block (c79e633)
 * is centered, max-w 106rem, 1.7/1.9/2rem font-light. Button (51884af) sits
 * 3rem below, centered. The live section also carries a deep-bg1.jpg
 * background (not in the round-3 asset set) — first pass omits it; Task 4
 * trues up the background treatment.
 */
export default function DeepHero() {
  return (
    <section className="pt-[3rem] pb-[3rem] text-center md:pt-[5rem] lg:pt-[6rem]">
      <div className="ec">
        <h1 className="text-herogreen text-[3rem] leading-[1.2em] font-bold uppercase md:text-[4rem] lg:text-[7.2rem]">
          {deepHero.h1}
        </h1>
        <div className="mx-auto max-w-[106rem]">
          {deepHero.paragraphs.map((p) => (
            <p
              key={p.slice(0, 40)}
              className="mt-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]"
            >
              {p}
            </p>
          ))}
        </div>
        <Link
          href="/book"
          className="bg-rust border-rust hover:text-rust mt-[3rem] inline-block rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white"
        >
          Set an appointment 👈
        </Link>
      </div>
    </section>
  );
}
