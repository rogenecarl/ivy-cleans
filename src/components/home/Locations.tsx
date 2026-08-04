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
 * The "Locations" heading (97293de) sits in its own zero-padding section, and
 * the text sections that follow (621b7186, 41821cb) carry none either — the
 * only vertical rhythm comes from the heading's 1rem widget margin and the
 * paragraphs' 2rem bottom margins. Between the heading section (3699c47) and
 * the paragraph section (621b7186), the live page inserts the Google Maps
 * embed (section 6455f48) — see MapEmbed.tsx — so it renders here rather
 * than at the very end of the page.
 */
export default function Locations() {
  return (
    <>
      <section className="bg-white">
        <div className="ec">
          <h2 className="text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[1rem] md:text-[4rem] lg:text-[4.5rem]">
            Locations
          </h2>
        </div>
      </section>
      <MapEmbed />
      <section className="bg-white">
        <div className="ec">
          <LocationRow list={areas.slice(0, 12)} trailingComma />
          <LocationRow list={areas.slice(12, 24)} trailingComma={false} />
          {/* live: the closing two paragraphs sit in a 112rem-wide widget */}
          <p className={`mb-[2rem] max-w-[112rem] ${bodyClass}`}>{zipParagraph}</p>
          <p className={`max-w-[112rem] ${bodyClass}`}>{landmarksParagraph}</p>
        </div>
      </section>
    </>
  );
}
