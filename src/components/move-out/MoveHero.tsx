import Link from "next/link";
import { moveHero } from "@/data/move-out";

/*
 * Section 8e7126c (post-241.css): h1 (72b9aa8) is centered, uppercase,
 * herogreen, 3/4/7.2rem across mobile/tablet/desktop. First paragraph
 * (52f5c93) is centered, max-w 120rem, 1.7/1.9/2rem font-light — the CTA
 * (d3dbf9e) sits directly below it. The remaining four paragraphs
 * (29455cb, in inner section 9683b22) are left-aligned, same type scale.
 * The live section also carries an out-bg1.jpg background (not in the
 * round-3 asset set) — first pass omits it; Task 4 trues up the background
 * treatment.
 */
export default function MoveHero() {
  const [first, ...rest] = moveHero.paragraphs;
  return (
    <section className="pt-[3rem] pb-[3rem] text-center md:pt-[5rem] lg:pt-[6rem]">
      <div className="ec">
        <h1 className="text-herogreen text-[3rem] leading-[1.2em] font-bold uppercase md:text-[4rem] lg:text-[7.2rem]">
          {moveHero.h1}
        </h1>
        <div className="mx-auto max-w-[120rem]">
          <p className="mt-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
            {first}
          </p>
        </div>
        <Link
          href="/book"
          className="bg-rust border-rust hover:text-rust mt-[3rem] inline-block rounded-[5px] border-[1px] px-[30px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white"
        >
          Set an appointment 👈
        </Link>
        <div className="mx-auto mt-[3rem] max-w-[120rem] text-left">
          {rest.map((p) => (
            <p
              key={p.slice(0, 40)}
              className="mb-[1rem] text-[1.7rem] leading-[1.5em] font-light last:mb-0 md:text-[1.9rem] lg:text-[2rem]"
            >
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
