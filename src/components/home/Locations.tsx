import Link from "next/link";
import { areas, type Area } from "@/data/areas";
import { zipParagraph, landmarksParagraph } from "@/data/home";

function LocationRow({ list, trailingComma }: { list: Area[]; trailingComma: boolean }) {
  return (
    <p className="mb-[2rem] text-[1.6rem] leading-[1.5em] font-light md:text-[1.8rem] lg:text-[1.9rem]">
      {list.map((a, i) => (
        <span key={a.href}>
          <Link href={a.href} className="hover:text-rust underline">
            {a.name}
          </Link>
          {i < list.length - 1 ? ", " : trailingComma ? "," : ""}
        </span>
      ))}
    </p>
  );
}

export default function Locations() {
  return (
    <section className="bg-[#fafafa] py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          Locations
        </h2>
        <LocationRow list={areas.slice(0, 12)} trailingComma />
        <LocationRow list={areas.slice(12, 24)} trailingComma={false} />
        <p className="mb-[2rem] text-[1.6rem] leading-[1.5em] font-light md:text-[1.8rem] lg:text-[1.9rem]">
          {zipParagraph}
        </p>
        <p className="text-[1.6rem] leading-[1.5em] font-light md:text-[1.8rem] lg:text-[1.9rem]">
          {landmarksParagraph}
        </p>
      </div>
    </section>
  );
}
