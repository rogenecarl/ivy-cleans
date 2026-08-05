import Link from "next/link";
import { areas } from "@/data/areas";
import { MapMarkerIcon } from "./Icons";

export default function ServiceArea() {
  return (
    <section
      className="bg-cover bg-top py-[1rem] md:py-[2rem] lg:py-[5rem]"
      style={{ backgroundImage: "url(/images/pexels-la-miko-36167641.jpg)" }}
    >
      <div className="ec">
        {/* 39580fa: widget-container margin-bottom -1.5rem below 768px */}
        <h3 className="mb-[0.5rem] text-center text-[1.8rem] leading-[1.2em] md:mb-[2rem] lg:text-[2.2rem]">
          House Cleaning Services Near Me in Minneapolis, MN
        </h3>
        {/* e140447: widget-container margin-bottom -1rem below 768px */}
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[2rem] md:text-[4rem] lg:text-[4.5rem]">
          Areas We Serve
        </h2>
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
    </section>
  );
}
