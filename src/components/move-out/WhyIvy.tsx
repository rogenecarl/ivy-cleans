import Image from "next/image";
import { whyIvy } from "@/data/move-out";

/*
 * Section 5f8003a (post-241.css): padding 6rem 0 (top-heavy: 3rem/1rem then
 * 2rem/0rem at tablet/mobile). Heading (de63694) centered black, 2.8/4/4.5rem.
 * Intro (b715131) left-aligned, font-light 2/1.9/1.7rem. The 5 qualities are
 * elementor-position-left image-box widgets (a672bb6/af8ecb4/75032cf/
 * 6c41eb6/3d3bc44) stacked in a single column — icon left (~25% of the box),
 * title 2rem/700/black, description 1.4rem/300/black — reproduced here as a
 * vertical icon+text list rather than a card grid, matching the live markup.
 * The live inner section also carries an out-img3.jpg side column, which per
 * the task-3 interface is reassigned to Cost instead.
 */
export default function WhyIvy() {
  return (
    <section className="py-[2rem] md:pt-[3rem] md:pb-[1rem] lg:pt-[6rem] lg:pb-[6rem]">
      <div className="ec">
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:text-[4.5rem]">
          {whyIvy.h2}
        </h2>
        <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
          {whyIvy.intro}
        </p>

        <div className="mx-auto max-w-[80rem]">
          {whyIvy.qualities.map((q) => (
            <div key={q.title} className="mb-[2rem] flex items-start gap-[2rem] last:mb-0">
              <Image
                src={q.icon}
                alt={q.alt}
                width={q.width}
                height={q.height}
                className="h-auto w-[8rem] shrink-0"
              />
              <div>
                <h3 className="mb-[10px] text-[2rem] leading-[1.2em] font-bold text-black">
                  {q.title}
                </h3>
                <p className="text-[1.4rem] leading-[1.5em] font-light text-black">{q.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
