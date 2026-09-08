import Link from "next/link";
import type { Area } from "@/data/areas";
import MapEmbed from "@/components/home/MapEmbed";

/* live: the text-editor widgets (4e4f0435 et al) are 2/1.9/1.7rem at weight
   300, and the <a> inside them renders at weight 400. */
const bodyClass =
  "text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:text-[2rem]";

const itemClass = "hover:text-rust font-normal underline";
// no hover colour: unlinked names must not look clickable
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

// four zero-padding sections: 3699c47 heading (15px margins), 6455f48 map, 621b7186 lists, 2dabc70 ZIPs
// (112rem cap, 3rem below from 1280). Separate sections keep the 10+10px gutters between them.
export default function Locations({
  areas,
  zips,
  mapSrc,
  hasSuburbPages,
}: {
  areas: Area[];
  zips: string[];
  mapSrc: string | null;
  /** False for a city whose suburb pages do not exist — names render unlinked. */
  hasSuburbPages: boolean;
}) {
  // two halves, the first longer on an odd count
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
      {zips.length > 0 && (
        <section className="bg-white">
          <div className="ec flex flex-col">
            <div className="max-w-[112rem]">
              <p className={`mb-[2rem] lg:mb-[3rem] ${bodyClass}`}>
                <span className="font-normal">ZIP codes we serve: </span>
                <span className="tabular-nums">{zips.join(", ")}</span>
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
