import Image from "next/image";
import { whyMoveOut } from "@/data/move-out";

/*
 * Section ebf286a (post-241.css): bg #F9FFFD, padding 6/3/2rem. Heading
 * (2977147) centered black, 2.8/4/4.5rem. Columns measure 47.674%/52.326%
 * at >=768px (stacked below). The live page actually splits the four
 * paragraphs across two alternating image/text rows (out-img1.jpg with
 * paragraphs 41-42, then paragraphs 43-44 with out-img2.jpg) — per the
 * task-3 interface this component uses a single out-img1.jpg image beside
 * all four paragraphs (out-img2.jpg is reassigned to IncludedServices).
 */
export default function WhyMoveOut() {
  return (
    <section className="pt-[2rem] pb-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:text-[4.5rem]">
          {whyMoveOut.h2}
        </h2>
        <div className="flex flex-wrap items-center gap-y-[2rem]">
          <div className="w-full md:w-[47.674%]">
            <Image
              src={whyMoveOut.image}
              alt=""
              width={703}
              height={486}
              className="h-auto w-full"
            />
          </div>
          <div className="w-full md:w-[52.326%] md:pl-[2rem]">
            {whyMoveOut.paragraphs.map((p) => (
              <p
                key={p.slice(0, 40)}
                className="mb-[1rem] text-[1.7rem] leading-[1.5em] font-light last:mb-0 md:text-[1.9rem] lg:text-[2rem]"
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
