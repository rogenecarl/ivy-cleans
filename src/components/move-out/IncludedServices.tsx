import { CheckItemIcon } from "@/components/Icons";
import { included } from "@/data/move-out";

/*
 * Section 86d3a37 (post-241.css): padding 6rem/9rem (desktop top/bottom),
 * 3rem/2rem at tablet/mobile. Heading (ebc9f75) centered black, 2.8/4/4.5rem.
 * Checklist (54c1f4f) is a single column, no image — width 50%/65%/100%
 * across desktop/tablet/mobile (left-aligned within the section, not
 * centered), items 2/1.9/1.7rem font-light black text, icon color #4D9682.
 * The live section carries an out-bg2.jpg background (not in the round-3
 * asset set, bg-position top right) — first pass omits it since the black
 * heading/list text stays legible on the default white background; Task 4
 * trues up the background treatment.
 */
export default function IncludedServices() {
  return (
    <section className="pt-[2rem] pb-[2rem] md:pt-[3rem] md:pb-[3rem] lg:pt-[6rem] lg:pb-[9rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:text-[4.5rem]">
          {included.h2}
        </h2>
        <ul className="md:w-[65%] lg:w-[50%]">
          {included.items.map((item) => (
            <li key={item} className="mb-[0.75rem] flex items-start gap-[1rem] last:mb-0">
              <CheckItemIcon className="mt-[0.3rem] h-[1.4rem] w-[1.4rem] shrink-0 text-[#4D9682]" />
              <span className="text-[1.6rem] leading-[1.4em] font-light text-black">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
