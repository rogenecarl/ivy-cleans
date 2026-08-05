import Image from "next/image";
import { packages, packagesIntro } from "@/data/packages";
import { CtaCompact } from "./CtaBand";

export default function Packages() {
  return (
    <section className="bg-white py-[1rem] md:py-[2rem] lg:py-[5rem]">
      {/* post-2035.css `.sec06 > .elementor-container{max-width:131.1rem!important}` —
          a pure rem cap riding the ladder: 1311 @1920, 1090.75 @1440 (probe: 1090.8) */}
      <div className="ec mx-auto max-w-[131.1rem]!">
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
            <div key={p.title} className="flex w-full md:w-1/2">
              <div className="border-brand bg-peach m-[1rem] flex flex-1 items-center border-[1px] p-[2.5rem]">
                <div className="flex w-full flex-col items-center text-center md:flex-row md:items-start md:text-left">
                  {/* live b8ee32c: `.elementor-image-box-img{width:40%}` (35% at
                      <=767) against the text's 100% basis — both flex items shrink
                      in proportion, so the rendered image is always 0.4/1.4 of the
                      row. Fixed 104/131px only matched 390/1440 (probe: 156 @1920,
                      125.83 @1280, 117.14 @1024, 80.56 @768). */}
                  <div className="w-[35%] shrink-0 md:mr-[2rem] md:w-auto md:shrink md:basis-[40%]">
                    <Image
                      src={p.icon}
                      alt=""
                      width={156}
                      height={156}
                      className="mx-auto h-auto w-full max-w-[156px]"
                    />
                  </div>
                  <div className="min-w-0 md:basis-full">
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
