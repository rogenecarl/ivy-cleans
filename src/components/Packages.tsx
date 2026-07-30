import Image from "next/image";
import { packages, packagesIntro } from "@/data/packages";
import { CtaCompact } from "./CtaBand";

export default function Packages() {
  return (
    <section className="bg-white py-[1rem] md:py-[2rem] lg:py-[5rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          Our Cleaning Service Packages
        </h2>
        <p className="mb-[2rem] text-center text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]">
          {packagesIntro}
        </p>
        {/* live: the inner section is 1071px wide inside the 1078px column, so each card body is 475px */}
        <div className="flex flex-wrap lg:mx-[3.5px]">
          {packages.map((p) => (
            <div key={p.title} className="w-full lg:w-1/2">
              <div className="border-brand bg-peach m-[1rem] flex flex-col items-center border-[1px] p-[2.5rem] text-center lg:flex-row lg:items-start lg:text-left">
                <Image
                  src={p.icon}
                  alt=""
                  width={156}
                  height={156}
                  className="h-[104px] w-[104px] shrink-0 lg:mr-[2rem] lg:h-[131px] lg:w-[131px]"
                />
                <div>
                  <h3 className="mt-[0.5rem] mb-[1.2rem] text-[2rem] leading-[1.2em] font-bold lg:text-[2.4rem]">
                    {p.title}
                  </h3>
                  <p className="text-[1.4rem] leading-[1.5em] font-light lg:text-[1.8rem]">{p.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-[3rem]">
          <CtaCompact />
        </div>
      </div>
    </section>
  );
}
