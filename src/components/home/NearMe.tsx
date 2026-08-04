import { nearMe } from "@/data/home";
import Features from "@/components/home/Features";

/*
 * Section 102673a0 (post-8.css): move-out-bg.jpg `top center / cover`, padding
 * 8rem 0 10rem (desktop), 3rem 0 1rem (<=1024), 2rem 0 0 (<=767). It wraps
 * both the "Cleaning Services Near Me" copy and the nested feature list
 * (1e52af1a), which is why <Features /> renders from here rather than as its
 * own section — the artwork has to run behind both.
 */
export default function NearMe() {
  return (
    <section
      className="bg-cover bg-top bg-no-repeat pt-[2rem] pb-0 md:pt-[3rem] md:pb-[1rem] lg:pt-[8rem] lg:pb-[10rem]"
      style={{ backgroundImage: "url(/images/move-out-bg.jpg)" }}
    >
      <div className="ec">
        <h2 className="text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:mb-[1rem] lg:text-[4.5rem]">
          Cleaning Services Near Me In Minneapolis, MN
        </h2>
        <div className="mb-[-2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:mb-0 lg:text-[2rem]">
          {nearMe.map((p) => (
            <p key={p.slice(0, 40)} className="mb-[2rem]">
              {p}
            </p>
          ))}
        </div>
        <Features />
      </div>
    </section>
  );
}
