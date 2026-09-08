"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ChevronRightIcon } from "@/components/Icons";
import type { MarketPhoto } from "@/content/types";

// post-8.css: heading 5d80ea1, carousel 6153513 (max 1205px, min-height 395px).
// swiper 741355c: 3-up from 1024, 2-up from 767, 1-up below; autoplay 5s, pauses on hover/interaction.
const MAX_PER_VIEW = 3;

// Moves a page at a time; the last page wraps into the head like swiper's clones,
// so TOTAL + MAX_PER_VIEW - 1 rendered items fill every page at every width.

// the page size has to be known in JS for the dots and the wrap point
const QUERIES = ["(min-width: 1024px)", "(min-width: 767px)"];

function subscribePerView(onChange: () => void) {
  const lists = QUERIES.map((q) => window.matchMedia(q));
  lists.forEach((l) => l.addEventListener("change", onChange));
  return () => lists.forEach((l) => l.removeEventListener("change", onChange));
}

function readPerView(): number {
  if (window.matchMedia(QUERIES[0]).matches) return 3;
  if (window.matchMedia(QUERIES[1]).matches) return 2;
  return 1;
}

/* SSR/first paint uses the desktop count, but page 0 is offset 0 at every
   perView, so the first paint is correct at all three widths regardless. */
const serverPerView = () => MAX_PER_VIEW;

// Also used by the suburb gallery, which renders its own heading.
export function WorkCarouselGallery({ workImages }: { workImages: readonly MarketPhoto[] }) {
  const TOTAL = workImages.length;
  const RENDERED = TOTAL + MAX_PER_VIEW - 1;
  const perView = useSyncExternalStore(subscribePerView, readPerView, serverPerView);
  const [rawPage, setRawPage] = useState(0);
  const [instant, setInstant] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [autoplay, setAutoplay] = useState(true);

  const pageCount = Math.ceil(TOTAL / perView);
  /* a narrower viewport has more pages, a wider one fewer; taking the stored
     page modulo the current count keeps it in range without an extra render */
  const page = rawPage % pageCount;

  /* re-enable the slide animation the frame after a wrap-around jump */
  useEffect(() => {
    if (!instant) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setInstant(false));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [instant]);

  const goTo = (target: number, byUser = false) => {
    const next = ((target % pageCount) + pageCount) % pageCount;
    /* swiper hides the loop seam with clones; we hide it by not animating the
       multi-page rewind that wrapping past the last page would otherwise show */
    setInstant(Math.abs(next - page) > 1);
    setRawPage(next);
    if (byUser) setAutoplay(false); // pause_on_interaction
  };

  useEffect(() => {
    if (!autoplay || hovered || pageCount < 2) return;
    const id = window.setTimeout(() => {
      const next = (page + 1) % pageCount;
      setInstant(Math.abs(next - page) > 1);
      setRawPage(next);
    }, 5000);
    return () => window.clearTimeout(id);
  }, [autoplay, hovered, page, pageCount]);

  // below the hooks on purpose: an early return would change the hook count
  if (TOTAL === 0) return null;

  return (
    <section className="bg-white">
      <div className="mx-auto flex min-h-[395px] w-full max-w-[1205px] items-center">
          {/* the column's own widget-wrap gutter */}
          <div className="w-full p-[10px]">
            <div
              /* .elementor-image-carousel-wrapper: 30px of pagination space */
              className="relative pb-[30px]"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              role="region"
              aria-roledescription="carousel"
              aria-label="Image Carousel"
            >
              <div className="relative">
                {/* live's slide images are inline, so the track carries ~0.4rem
                    of line-box descender under them (299.73 vs 296.25 @1440) */}
                <div className="overflow-hidden pb-[0.4rem]">
                  <div
                    className={`flex w-full ${
                      instant ? "" : "transition-transform duration-500 ease-out"
                    }`}
                    style={{ transform: `translateX(-${page * 100}%)` }}
                  >
                    {Array.from({ length: RENDERED }, (_, i) => (
                      <div
                        key={i}
                        className="w-full shrink-0 min-[767px]:w-1/2 min-[1024px]:w-1/3"
                      >
                        <Image
                          src={workImages[i % TOTAL].path}
                          alt={workImages[i % TOTAL].alt}
                          width={800}
                          height={600}
                          className="aspect-[4/3] w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {/* elementor-arrows-position-inside: 25px glyphs inset 10px and
                    centred on the slides, not on the pagination band */}
                <button
                  onClick={() => goTo(page - 1, true)}
                  aria-label="Previous image"
                  className="absolute top-1/2 left-[10px] flex h-[25px] w-[25px] -translate-y-1/2 items-center justify-center text-[#3f444b]"
                >
                  <ChevronRightIcon className="h-[25px] w-[25px] rotate-180" />
                </button>
                <button
                  onClick={() => goTo(page + 1, true)}
                  aria-label="Next image"
                  className="absolute top-1/2 right-[10px] flex h-[25px] w-[25px] -translate-y-1/2 items-center justify-center text-[#3f444b]"
                >
                  <ChevronRightIcon className="h-[25px] w-[25px]" />
                </button>
              </div>
              {/* navigation "both" => swiper's dots: 6px bullets 6px apart in a
                  one-line box sitting 5px off the bottom of the 30px band */}
              <div className="absolute inset-x-0 bottom-[5px] flex h-[1.5rem] items-center justify-center gap-[12px]">
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i, true)}
                    aria-label={`Go to slide group ${i + 1}`}
                    aria-current={i === page}
                    className={`h-[6px] w-[6px] rounded-full bg-black transition-opacity ${
                      i === page ? "opacity-100" : "opacity-20"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
    </section>
  );
}

// /home: heading + gallery
export default function WorkCarousel({ workImages }: { workImages: readonly MarketPhoto[] }) {
  if (workImages.length === 0) return null;
  return (
    <>
      <section className="bg-white">
        <div className="ec flex flex-col">
          <h2 className="text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[1rem] md:text-[4rem] lg:text-[4.5rem]">
            Our Cleaning Work In Action
          </h2>
        </div>
      </section>
      <WorkCarouselGallery workImages={workImages} />
    </>
  );
}
