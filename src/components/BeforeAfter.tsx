import Image from "next/image";
import { CtaCompact } from "./CtaBand";

export default function BeforeAfter() {
  return (
    <section
      className="bg-cover bg-top py-[1rem] md:py-[2rem] lg:py-[9rem]"
      style={{ backgroundImage: "url(/images/cleaning-bg2.jpg)" }}
    >
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          Our Cleaning Work In Action
        </h2>
        <div className="mt-[1rem] mb-[4rem] flex flex-wrap">
          {[
            { src: "/images/before.jpg", label: "before" },
            { src: "/images/after.jpg", label: "after" },
          ].map((item) => (
            /* live: elementor's inner columns add their own 10px widget-wrap padding */
            <figure key={item.label} className="w-full px-[1rem] py-[10px] lg:w-1/2">
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
        <CtaCompact />
      </div>
    </section>
  );
}
