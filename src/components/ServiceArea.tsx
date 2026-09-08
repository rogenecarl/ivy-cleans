import Link from "next/link";
import type { Area } from "@/data/areas";
import type { TokenSource } from "@/content/interpolate";
import { t } from "@/content/interpolate";
import { MapMarkerIcon } from "./Icons";

export default function ServiceArea({
  areas,
  bits,
  mapSrc,
  hasSuburbPages,
  heading,
  id,
}: {
  areas: Area[];
  bits: TokenSource;
  mapSrc: string | null;
  /** False for a city whose suburb pages do not exist — names render unlinked. */
  hasSuburbPages: boolean;
  /** Service pages pass their own h2 and get no eyebrow. */
  heading?: { title: string };
  /** Fragment target; the front page sets "areas" so breadcrumbs can point here. */
  id?: string;
}) {
  // column-first grid, rows = half the list. `grid-rows-12` stays literal for Tailwind's
  // scanner and Minneapolis's markup; any other count goes inline.
  const rows = Math.ceil(areas.length / 2);
  const rowsStyle =
    rows === 12 ? undefined : { gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` };
  const itemClass =
    "hover:text-rust flex items-start gap-[0.5rem] text-[1.7rem] leading-[1.2em] font-semibold lg:text-[2rem]";
  // no hover colour: unlinked names must not look clickable
  const plainItemClass =
    "flex items-start gap-[0.5rem] text-[1.7rem] leading-[1.2em] font-semibold lg:text-[2rem]";
  return (
    <section
      id={id}
      className="bg-cover bg-top py-[1rem] md:py-[2rem] lg:py-[6rem] xl:py-[5rem]"
      style={{ backgroundImage: "url(/images/pexels-la-miko-36167641.jpg)" }}
    >
      <div className="ec">
        {/* 39580fa: widget-container margin-bottom -1.5rem below 768px */}
        {heading === undefined && (
          <h3 className="mb-[0.5rem] text-center text-[1.8rem] leading-[1.2em] md:mb-[2rem] md:text-[2.2rem]">
            {t("House Cleaning Services Near Me in {city}, {state}", bits)}
          </h3>
        )}
        {/* e140447: widget-container margin-bottom -1rem below 768px */}
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[2rem] md:text-[4rem] lg:text-[4.5rem]">
          {heading?.title ?? "Areas We Serve"}
        </h2>
        {/* 8c1d4ea: map 80c999d + list 117763a, stacked below 768 */}
        <div className="md:flex md:items-start lg:items-center">
          {/* b84b01e: 55.725% wide, 10rem right margin above 1024 */}
          <div className="mb-[1rem] p-[10px] md:mb-0 md:w-[55.725%] lg:mr-[10rem]">
            {/* b84b01e iframe; null mapSrc omits it */}
            {mapSrc !== null && (
              <iframe
                loading="lazy"
                src={mapSrc}
                title="Ivy Cleans 5821"
                aria-label="Ivy Cleans 5821"
                className="h-[35rem] w-full md:h-[59.5rem]"
              />
            )}
          </div>
          {/* 08a872b icon list */}
          <div className="md:w-[44.234%] md:p-[10px]">
            {/* 08a872b: rows 2.5rem apart from 768, 2rem below */}
            <ul
              className="mx-auto grid max-w-[47rem] grid-flow-col grid-cols-2 grid-rows-12 gap-x-[2rem] gap-y-[2rem] md:gap-y-[2.5rem]"
              style={rowsStyle}
            >
              {/* no shared fragment: it adds a <!-- --> inside the anchor */}
              {areas.map((a) =>
                hasSuburbPages ? (
                  <li key={a.name}>
                    <Link href={a.href} className={itemClass}>
                      <MapMarkerIcon className="text-brand mt-[1px] h-[2rem] w-[2rem] shrink-0" />
                      {a.name}
                    </Link>
                  </li>
                ) : (
                  // Same box, no anchor: the suburb page this would point at
                  // does not exist for this city.
                  <li key={a.name}>
                    <span className={plainItemClass}>
                      <MapMarkerIcon className="text-brand mt-[1px] h-[2rem] w-[2rem] shrink-0" />
                      {a.name}
                    </span>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
