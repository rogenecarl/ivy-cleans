import Image from "next/image";
import { packages, packagesIntro } from "@/data/packages";

export default function Packages() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1140px] px-4 text-center">
        <h2 className="text-[2.8rem] leading-tight font-bold md:text-[4rem] lg:text-[4.5rem]">
          Our Cleaning Service Packages
        </h2>
        <p className="mx-auto mt-6 max-w-4xl leading-relaxed">{packagesIntro}</p>
        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {packages.map((p) => (
            <div key={p.title}>
              <Image src={p.icon} alt="" width={156} height={156} className="mx-auto h-[110px] w-[110px]" />
              <h3 className="mt-4 text-[1.8rem] leading-snug md:text-[2.2rem] md:leading-snug">{p.title}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
