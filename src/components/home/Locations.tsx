import Link from "next/link";
import { areas, type Area } from "@/data/areas";
import { zipParagraph, landmarksParagraph } from "@/data/home";
import MapEmbed from "@/components/home/MapEmbed";

/* live: the text-editor widgets (4e4f0435 et al) are 2/1.9/1.7rem at weight
   300, and the <a> inside them renders at weight 400. */
const bodyClass =
  "text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]";

function LocationRow({ list, trailingComma }: { list: Area[]; trailingComma: boolean }) {
  return (
    <p className={`mb-[2rem] ${bodyClass}`}>
      {list.map((a, i) => (
        <span key={a.href}>
          <Link href={a.href} className="hover:text-rust font-normal underline">
            {a.name}
          </Link>
          {i < list.length - 1 ? ", " : trailingComma ? "," : ""}
        </span>
      ))}
    </p>
  );
}

/*
 * Four live sections, all with zero section padding:
 *   3699c47  the "Locations" heading — post-8.css gives it
 *            `margin-top:15px;margin-bottom:15px`, flat px at every width, and
 *            the heading widget adds a 1rem container margin at >=768.
 *   6455f48  the Google Maps embed (MapEmbed.tsx) — it really does sit between
 *            the heading and the location lists on the live page.
 *   621b7186 the two location-list paragraphs (widget 4e4f0435).
 *   2dabc70  the ZIP and landmark paragraphs (widget 41821cb, capped at
 *            112rem from 768 up; its container adds a 3rem bottom margin at
 *            >=1280 that swallows the last paragraph's 2rem).
 * Keeping them as four sections is what puts the 10+10px widget gutters
 * between the blocks — a single section would run 20px short at each seam.
 */
export default function Locations() {
  return (
    <>
      <section className="my-[15px] bg-white">
        <div className="ec flex flex-col">
          <h2 className="text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[1rem] md:text-[4rem] lg:text-[4.5rem]">
            Locations
          </h2>
        </div>
      </section>
      <MapEmbed />
      <section className="bg-white">
        <div className="ec flex flex-col">
          <div>
            <LocationRow list={areas.slice(0, 12)} trailingComma />
            <LocationRow list={areas.slice(12, 24)} trailingComma={false} />
          </div>
        </div>
      </section>
      <section className="bg-white">
        <div className="ec flex flex-col">
          <div className="max-w-[112rem]">
            <p className={`mb-[2rem] ${bodyClass}`}>{zipParagraph}</p>
            <p className={`mb-[2rem] lg:mb-[3rem] ${bodyClass}`}>{landmarksParagraph}</p>
          </div>
        </div>
      </section>
    </>
  );
}
