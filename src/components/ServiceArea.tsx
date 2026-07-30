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
        <h3 className="mb-[2rem] text-center text-[1.8rem] leading-[1.2em] lg:text-[2.2rem]">
          House Cleaning Services Near Me in Minneapolis, MN
        </h3>
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          Areas We Serve
        </h2>
        {/* live: two icon-list columns filled top-to-bottom, 12 entries each */}
        <ul className="mx-auto grid max-w-[47rem] grid-flow-col grid-cols-2 grid-rows-12 gap-x-[2rem] gap-y-[1rem]">
          {areas.map((a) => (
            <li key={a.name} className="pb-[1rem]">
              <Link
                href={a.href}
                className="hover:text-rust flex items-center gap-[0.6rem] text-[1.7rem] leading-[1.2em] font-semibold lg:text-[2rem]"
              >
                <MapMarkerIcon className="text-brand h-[1.7rem] w-[1.7rem] shrink-0" />
                {a.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
