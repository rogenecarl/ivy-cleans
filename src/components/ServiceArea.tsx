import Link from "next/link";
import { areas } from "@/data/areas";
import { MapMarkerIcon } from "./Icons";

export default function ServiceArea() {
  return (
    <section
      className="bg-cover bg-top py-[1rem] md:py-[2rem] lg:py-[6rem] xl:py-[5rem]"
      style={{ backgroundImage: "url(/images/pexels-la-miko-36167641.jpg)" }}
    >
      <div className="ec">
        {/* 39580fa: widget-container margin-bottom -1.5rem below 768px */}
        <h3 className="mb-[0.5rem] text-center text-[1.8rem] leading-[1.2em] md:mb-[2rem] md:text-[2.2rem]">
          House Cleaning Services Near Me in Minneapolis, MN
        </h3>
        {/* e140447: widget-container margin-bottom -1rem below 768px */}
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[2rem] md:text-[4rem] lg:text-[4.5rem]">
          Areas We Serve
        </h2>
        {/* live 8c1d4ea: inner section holding the map (80c999d, col-50) and the
            areas list (117763a, col-50); stacked below 768px, a row from 768px up.
            117763a: align-items center from 1024px (flex-start 768-1023, per
            @media(max-width:1024px)); 80c999d carries the 10rem column gap as its
            own margin-right, only above 1024px (reset to 0 at <=1024). */}
        <div className="md:flex md:items-start lg:items-center">
          {/* left col-50: b84b01e — width 55.725% (768px up), margin-right 10rem
              (>1024px only). Each inner column keeps its own 10px kit widget-wrap
              padding, nested inside the outer `.ec`'s own 10px — live column box
              height @1440 is 495.04 (iframe) + 20 (this padding) = 515.0, which is
              exactly what the container-height/first-item-offset back-solve from
              the live probe requires. */}
          <div className="mb-[1rem] p-[10px] md:mb-0 md:w-[55.725%] lg:mr-[10rem]">
            {/* b84b01e iframe: height 59.5rem (768px up), 35rem below 768px */}
            <iframe
              loading="lazy"
              src="https://maps.google.com/maps?q=Ivy%20Cleans%205821&t=m&z=14&output=embed&iwloc=near"
              title="Ivy Cleans 5821"
              aria-label="Ivy Cleans 5821"
              className="h-[35rem] w-full md:h-[59.5rem]"
            />
          </div>
          {/* right col-50: 08a872b icon-list — the 10px column padding only shows up
              in the row layout (>=768px); below that the live list column width
              back-solves to the full 370px content width (no extra inset) */}
          <div className="md:w-[44.234%] md:p-[10px]">
            {/*
              live 08a872b: icon-list rows are separated by 2.5rem (padding-block-end +
              margin-block-start of 2.5rem/2 each) from 768px up and 2rem below it (live
              probe pitch 40.75 @1440 / 40.4 @390 against a 20px line box);
              --e-icon-list-icon-size:2rem with a 25%-of-size right margin.
            */}
            <ul className="mx-auto grid max-w-[47rem] grid-flow-col grid-cols-2 grid-rows-12 gap-x-[2rem] gap-y-[2rem] md:gap-y-[2.5rem]">
              {areas.map((a) => (
                <li key={a.name}>
                  <Link
                    href={a.href}
                    className="hover:text-rust flex items-start gap-[0.5rem] text-[1.7rem] leading-[1.2em] font-semibold lg:text-[2rem]"
                  >
                    <MapMarkerIcon className="text-brand mt-[1px] h-[2rem] w-[2rem] shrink-0" />
                    {a.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
