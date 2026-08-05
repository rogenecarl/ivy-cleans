import Image from "next/image";
import { packages, packagesIntro } from "@/data/packages";
import { CtaCompact } from "./CtaBand";

export default function Packages() {
  return (
    <section className="bg-white py-[1rem] md:py-[2rem] lg:py-[5rem]">
      {/* post-2035.css `.sec06 > .elementor-container{max-width:131.1rem!important}` —
          1090.75px at the 1440 step of the ladder (live probe: 1090.8) */}
      <div className="ec mx-auto max-w-[min(1098px,131.1rem)]!">
        {/* 6e409d4: widget-container margin-bottom -1rem below 768px */}
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[2rem] md:text-[4rem] lg:text-[4.5rem]">
          Our Cleaning Service Packages
        </h2>
        {/* 5b465a0 keeps its paragraph's own 2rem margin on top of the kit's 2rem
            widget spacing — live probe gap to the first card row: 33.2px @1440 */}
        <p className="mb-[2rem] text-center text-[1.7rem] leading-[1.5em] font-light md:mb-[4rem] md:text-[1.9rem] lg:text-[2rem]">
          {packagesIntro}
        </p>
        <div className="flex flex-wrap">
          {/* live rows are inner sections whose two col-50 widget-wraps stretch to the
              row height (31afa6b: align-content/align-items:center, margin 1rem,
              padding 2.5rem, 1px #40907A border) with the image-box centred inside */}
          {packages.map((p) => (
            <div key={p.title} className="flex w-full lg:w-1/2">
              <div className="border-brand bg-peach m-[1rem] flex flex-1 items-center border-[1px] p-[2.5rem]">
                <div className="flex w-full flex-col items-center text-center lg:flex-row lg:items-start lg:text-left">
                  <Image
                    src={p.icon}
                    alt=""
                    width={156}
                    height={156}
                    className="h-[104px] w-[104px] shrink-0 lg:mr-[2rem] lg:h-[131px] lg:w-[131px]"
                  />
                  <div className="min-w-0">
                    {/* b8ee32c: title margin 0.5rem top / 10px bottom */}
                    <h3 className="mt-[9px] mb-[10px] text-[2rem] leading-[1.2em] font-bold md:mt-[0.5rem] lg:text-[2.4rem]">
                      {p.title}
                    </h3>
                    <p className="text-[1.4rem] leading-[1.5em] font-light lg:text-[1.8rem]">{p.text}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <CtaCompact variant="packages" />
      </div>
    </section>
  );
}
