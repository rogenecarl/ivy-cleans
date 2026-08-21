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
        {/* padding, not margin: the h2's own 2rem bottom margin would swallow it.
            The trailing gap to the CTA is device-specific — the single 4rem this
            used to carry left the whole page below the photos 2rem low at
            1280/1440/1920 (probe drift 17.56/16.78/19.94px = 2rem at each ladder
            step) and 2rem high at 768/1024 (+15.6px). */}
        {/* the photo row is its own inner section, and post-2035.css caps *that*
            container at a fixed 1130px: `.elementor-element-8dcc8eb >
            .elementor-container{max-width:1130px}`. Without it the photos stretched
            to the full 132rem container at 1920 (630 wide against live's 545 =
            1130/2 - 2x10px of column padding). */}
        <div className="mx-auto flex max-w-[1130px] flex-wrap md:mt-0 md:mb-[2rem] md:pt-[1rem] lg:mb-[6rem]">
          {[
            { src: "/images/before.jpg", label: "before" },
            { src: "/images/after.jpg", label: "after" },
          ].map((item) => (
            /* live: elementor's inner columns add their own 10px widget-wrap padding */
            <figure key={item.label} className="w-full px-[10px] py-[10px] md:w-1/2">
              <Image src={item.src} alt="" width={555} height={417} className="mb-[2rem] h-auto w-full" />
              {/*
                live: the caption widget-container is #000 with 1.5rem padding and margin-top:-2rem,
                which exactly cancels the image widget's 2rem bottom spacing — the bar sits flush
                under the photo.
              */}
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
