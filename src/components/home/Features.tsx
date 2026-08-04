import Image from "next/image";
import { features, featuresOutro } from "@/data/home";

/*
 * Nested section 1e52af1a inside 102673a0: margin 2rem/7rem on desktop,
 * 0/2rem at <=1024 and 0/1rem at <=767. Its first column (7fe05c38) is 54.76%
 * wide (70% at 768–1024) so the background artwork stays clear on the right.
 * Each entry is an `elementor-position-left` image box: icon at 17% of the box
 * (25% on mobile) with a 2rem gutter, 2rem/700 title, 1.4rem/300 description.
 * The closing paragraph 5d938fe is full width at 2/1.9/1.7rem.
 */
export default function Features() {
  return (
    <>
      <div className="mt-0 mb-[1rem] flex flex-wrap md:mb-[2rem] lg:mt-[2rem] lg:mb-[7rem]">
        <div className="w-full px-[10px] md:w-[70%] lg:w-[54.76%]">
          {features.map((f, i) => (
            <article
              key={f.title}
              className={`flex flex-col items-center text-center md:flex-row md:items-start md:text-start ${
                i === features.length - 1 ? "" : "mb-[1rem] lg:mb-[2rem]"
              }`}
            >
              {/* live @390 the image box switches to elementor-position-top:
                  the copy measures x=20/w=350 (full column, centred) */}
              <div className="mb-[1rem] w-[8.6rem] shrink-0 md:mb-0 md:w-[25%] md:pr-[2rem] lg:w-[17%]">
                <Image
                  src={f.icon}
                  alt=""
                  width={f.width}
                  height={f.height}
                  className="h-auto w-full"
                />
              </div>
              <div className="w-full min-w-0 md:flex-1">
                <h3 className="mb-[10px] text-[2rem] leading-[1.2em] font-bold">{f.title}</h3>
                <p className="text-[1.4rem] leading-[1.5em] font-light">{f.text}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden md:block md:w-[30%] lg:w-[45.24%]" />
      </div>
      <p className="text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
        {featuresOutro}
      </p>
    </>
  );
}
