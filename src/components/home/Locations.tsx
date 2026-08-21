import Link from "next/link";
import type { Area } from "@/data/areas";
import MapEmbed from "@/components/home/MapEmbed";

/* live: the text-editor widgets (4e4f0435 et al) are 2/1.9/1.7rem at weight
   300, and the <a> inside them renders at weight 400. */
const bodyClass =
  "text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]";

const itemClass = "hover:text-rust font-normal underline";
/* Same weight, no underline and no link hover colour — dead text must not look
   clickable. Only reachable when hasSuburbPages is false, i.e. never for the
   live city, so it carries no fidelity risk. */
const plainItemClass = "font-normal";

function LocationRow({
  list,
  trailingComma,
  linked,
}: {
  list: Area[];
  trailingComma: boolean;
  linked: boolean;
}) {
  return (
    <p className={`mb-[2rem] ${bodyClass}`}>
      {list.map((a, i) => (
        <span key={a.href}>
          {linked ? (
            <Link href={a.href} className={itemClass}>
              {a.name}
            </Link>
          ) : (
            // Same box, no anchor: this city has no suburb pages to link to.
            <span className={plainItemClass}>{a.name}</span>
          )}
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
export default function Locations({
  areas,
  zipParagraph,
  landmarksParagraph,
  mapSrc,
  hasSuburbPages,
}: {
  areas: Area[];
  zipParagraph: string;
  landmarksParagraph: string;
  mapSrc: string | null;
  /** False for a city whose suburb pages do not exist — names render unlinked. */
  hasSuburbPages: boolean;
}) {
  // Two paragraphs, first one longer on an odd count. Minneapolis's 24 entries
  // give 12/12 — the same split the hardcoded slices used to make — and no
  // entry can fall off the end for a longer or shorter list.
  const half = Math.ceil(areas.length / 2);
  return (
    <>
      <section className="my-[15px] bg-white">
        <div className="ec flex flex-col">
          <h2 className="text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[1rem] md:text-[4rem] lg:text-[4.5rem]">
            Locations
          </h2>
        </div>
      </section>
      <MapEmbed mapSrc={mapSrc} />
      <section className="bg-white">
        <div className="ec flex flex-col">
          <div>
            <LocationRow list={areas.slice(0, half)} trailingComma linked={hasSuburbPages} />
            <LocationRow list={areas.slice(half)} trailingComma={false} linked={hasSuburbPages} />
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
