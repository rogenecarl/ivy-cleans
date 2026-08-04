import Link from "next/link";
import { cost } from "@/data/move-out";

/*
 * Section 2e0aad8 (post-241.css): padding 6/3/2rem. Heading (4a76afe)
 * centered white, 2.8/4/4.5rem. Paragraphs (ba5f52c) left-aligned white,
 * full-width, font-light 2/1.9/1.7rem — no image (out-img3.jpg lives in the
 * live DOM's WhyIvy side column). Button (aff666b) centered, 1rem top
 * margin. The live section carries an out-bg3.jpg background (not in the
 * round-3 asset set) — herogreen stands in as a placeholder dark background
 * (matching the white text) until Task 4 adds the real image.
 */
export default function Cost() {
  return (
    <section className="bg-herogreen py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-white md:text-[4rem] lg:text-[4.5rem]">
          {cost.h2}
        </h2>
        {cost.paragraphs.map((p) => (
          <p
            key={p.slice(0, 40)}
            className="mb-[1rem] text-[1.7rem] leading-[1.5em] font-light text-white last:mb-0 md:text-[1.9rem] lg:text-[2rem]"
          >
            {p}
          </p>
        ))}
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
