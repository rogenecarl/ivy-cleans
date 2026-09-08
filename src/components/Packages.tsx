import Image from "next/image";
import Link from "next/link";
import type { Pkg } from "@/data/packages";
import type { SiteData } from "@/data/site";
import { CtaCompact } from "./CtaBand";

export default function Packages({
  packagesIntro,
  packages,
  site,
}: {
  packagesIntro: string;
  packages: Pkg[];
  site: SiteData["site"];
}) {
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
          {/* 31afa6b rows: centred, 1rem margin, 2.5rem padding, 1px #40907A border */}
          {packages.map((p) => (
            <div key={p.title} className="flex w-full md:w-1/2">
              <div className="border-brand bg-peach m-[1rem] flex flex-1 items-center border-[1px] p-[2.5rem]">
                <div className="flex w-full flex-col items-center text-center md:flex-row md:items-start md:text-left">
                  {/* b8ee32c image 40% (35% mobile) against the text's 100% basis, both shrinkable */}
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
                      {/* every card is one of the seven service pages (item 13) */}
                      <Link href={p.href} className="hover:text-rust">
                        {p.title}
                      </Link>
                    </h3>
                    <p className="text-[1.4rem] leading-[1.5em] font-light lg:text-[1.8rem]">{p.text}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <CtaCompact site={site} variant="packages" />
      </div>
    </section>
  );
}
