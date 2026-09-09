import Link from "next/link";
import type { SuburbData } from "@/data/suburb";
import { MapMarkerIcon } from "@/components/Icons";

// No live reference: this block is new. Same heading scale and marker list as Areas We Serve.
export default function NearbyAreas({ nearby }: { nearby: SuburbData["nearby"] }) {
  if (nearby.links.length === 0) return null;
  return (
    <section className="bg-white py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold text-black md:text-[4rem] lg:mb-[3rem] lg:text-[4.5rem]">
          {nearby.heading}
        </h2>
        <ul className="flex flex-wrap justify-center gap-x-[4rem] gap-y-[2rem]">
          {nearby.links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="hover:text-rust flex items-start gap-[0.5rem] text-[1.7rem] leading-[1.2em] font-semibold lg:text-[2rem]"
              >
                <MapMarkerIcon className="text-brand mt-[1px] h-[2rem] w-[2rem] shrink-0" />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
