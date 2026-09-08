import Image from "next/image";
import type { SiteData } from "@/data/site";
import { CtaCompact } from "./CtaBand";

export default function BeforeAfter({ site }: { site: SiteData["site"] }) {
  return (
    <section
      className="bg-cover bg-top py-[1rem] md:py-[2rem] lg:py-[6rem] xl:py-[9rem]"
      style={{ backgroundImage: "url(/images/cleaning-bg2.jpg)" }}
    >
      <div className="ec">
        {/* 0cf4515: widget-container margin-bottom -1rem below 768px */}
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[2rem] md:text-[4rem] lg:text-[4.5rem]">
          Our Cleaning Work In Action
        </h2>
        {/* padding, not margin: the h2's 2rem bottom margin would swallow it */}
        {/* 8dcc8eb container: max-width 1130px */}
        <div className="mx-auto flex max-w-[1130px] flex-wrap md:mt-0 md:mb-[2rem] md:pt-[1rem] lg:mb-[6rem]">
          {[
            { src: "/images/before.jpg", label: "before" },
            { src: "/images/after.jpg", label: "after" },
          ].map((item) => (
            /* live: elementor's inner columns add their own 10px widget-wrap padding */
            <figure key={item.label} className="w-full px-[10px] py-[10px] md:w-1/2">
              <Image src={item.src} alt="" width={555} height={417} className="mb-[2rem] h-auto w-full" />
              {/* caption: #000, 1.5rem padding, margin-top -2rem cancels the image spacing */}
              <figcaption className="mt-[-2rem] bg-black p-[1.5rem]">
                <h3 className="text-center text-[1.8rem] leading-[1.2em] font-medium text-white uppercase md:text-[2rem] lg:text-[2.6rem]">
                  {item.label}
                </h3>
              </figcaption>
            </figure>
          ))}
        </div>
        <CtaCompact site={site} />
      </div>
    </section>
  );
}
