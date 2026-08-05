import { nearMe } from "@/data/home";
import Features from "@/components/home/Features";

/*
 * Section 102673a0 (post-8.css): move-out-bg.jpg `top center / cover`, padding
 * 8rem 0 10rem (>=1280), 3rem 0 1rem (768–1024), 2rem 0 0 (<=767). It wraps
 * both the "Cleaning Services Near Me" copy and the nested feature list
 * (1e52af1a), which is why <Features /> renders from here rather than as its
 * own section — the artwork has to run behind both.
 *
 * Widget rhythm (live probe): the h2 widget 25a9d3d has `margin-bottom:2rem`
 * plus a 1rem container margin at >=768 (3rem net) and 2rem at <=767. The copy
 * widget 2d274d3f keeps its last paragraph's 2rem *and* adds its own 2rem at
 * >=1280 (4rem net), but at <=1024 its widget-container carries
 * `margin-bottom:-2rem`, which cancels that trailing paragraph margin and
 * leaves 2rem. `flex flex-col` reproduces elementor's flex widget-wrap, where
 * these margins never collapse into one another.
 */
export default function NearMe() {
  return (
    <section
      className="bg-cover bg-top bg-no-repeat pt-[2rem] pb-0 md:pt-[3rem] md:pb-[1rem] lg:pt-[8rem] lg:pb-[10rem]"
      style={{ backgroundImage: "url(/images/move-out-bg.jpg)" }}
    >
      <div className="ec flex flex-col">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[3rem] md:text-[4rem] lg:text-[4.5rem]">
          Cleaning Services Near Me In Minneapolis, MN
        </h2>
        <div className="text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:mb-[2rem] lg:text-[2rem]">
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
