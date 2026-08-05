import Image from "next/image";
import { features, featuresOutro } from "@/data/home";

/*
 * Nested section 1e52af1a inside 102673a0: margin 2rem/7rem at >=1280,
 * 0/2rem at 768–1024 and 0/1rem at <=767. Its first column (7fe05c38) is
 * 54.76% wide (70% at 768–1024, 100% at <=767); the empty art column keeps its
 * 45.2% at every width, so below 1025 it wraps onto its own line — live
 * measures it 1px tall there.
 *
 * Each entry is an `elementor-position-left` image box. Live's wrapper is a
 * flex row where the figure is `width:17%` and the content `width:100%`, both
 * shrinkable — that shrink is why the icon renders 71.86px (not 17% = 86.9) in
 * a 511.2px box at 1440 and 96.3px in a 682.8px box at 1024. Reproducing the
 * two widths verbatim reproduces the shrink. The `<img>` keeps its natural
 * size under `max-width:100%`, so it is 86px wide wherever the figure is wider.
 * Below 768 the box switches to `elementor-position-top`: the figure becomes a
 * centred 25%-wide inline-block and the copy is centred under it, 0.9rem below
 * (the line-box descender plus the title's 0.5rem top margin).
 *
 * Item rhythm: widget `margin-bottom:2rem` plus a container margin of 2rem at
 * >=768 / 1rem at <=767 — 4rem and 3rem net; the last item has neither.
 * The closing paragraph 5d938fe is full width at 2/1.9/1.7rem.
 */
export default function Features() {
  return (
    <>
      <div className="mt-0 mb-[1rem] flex flex-wrap md:mb-[2rem] lg:mt-[2rem] lg:mb-[7rem]">
        <div className="flex w-full flex-col p-[10px] md:w-[70%] lg:w-[54.76%]">
          {features.map((f, i) => (
            <article
              key={f.title}
              className={`text-center md:flex md:text-start ${
                i === features.length - 1 ? "" : "mb-[3rem] md:mb-[4rem]"
              }`}
            >
              <figure className="mx-auto mb-[0.9rem] w-[25%] md:mx-0 md:mr-[2rem] md:mb-0 md:w-[17%]">
                <Image
                  src={f.icon}
                  alt=""
                  width={f.width}
                  height={f.height}
                  className="h-auto max-w-full"
                />
              </figure>
              <div className="w-full">
                <h3 className="mt-[0.5rem] mb-[10px] text-[2rem] leading-[1.2em] font-bold">
                  {f.title}
                </h3>
                <p className="text-[1.4rem] leading-[1.5em] font-light">{f.text}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="h-[1px] w-full md:w-[45.2%] lg:h-auto" />
      </div>
      <p className="mb-[2rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
        {featuresOutro}
      </p>
    </>
  );
}
