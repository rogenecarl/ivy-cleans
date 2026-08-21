"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ChevronRightIcon } from "@/components/Icons";

/*
 * Two live sections: 5d80ea1 holds only the heading (zero padding, the usual
 * 1rem heading-container margin at >=768), then 6153513 holds the carousel.
 * post-8.css pins that one down exactly:
 *   .elementor-element-6153513 > .elementor-container{max-width:1205px;
 *                                                     min-height:395px}
 * Both are flat px, so the section is 395px tall at every one of the seven
 * probed widths and the container is 1205px wide from 1280 up, then simply the
 * viewport (1024 / 768 / 390). The column is vertically centred inside the
 * 395px (live: 22.62px of slack above the slides at 1440, 45 at 1024, 31.75 at
 * 390 — always half the leftover).
 *
 * Widget 741355c data-settings: slides_to_show 3, slides_to_scroll 3,
 * infinite yes, autoplay yes @5000ms, pause_on_hover yes, pause_on_interaction
 * yes, navigation "both" (arrows + dots), speed 500, arrows position inside.
 * Elementor feeds swiper `breakpoints[767] = tablet` and
 * `breakpoints[1024] = desktop` over a mobile base, which is exactly what the
 * live probe shows: 1-up below 767, 2-up at 768 (slides 374 of 748), 3-up from
 * 1024 up (334.66 of 1004 at 1024, 395 of 1185 at >=1280). Note 1024 is
 * already 3-up — the carousel's desktop threshold is *not* the site's 1025.
 */
const MAX_PER_VIEW = 3;

/*
 * Window math — why no nav state can ever show a blank pane.
 *
 * slides_to_scroll === slides_to_show, so the carousel moves a *page* at a
 * time: page p shows slides p*perView … p*perView+perView-1 and there are
 * pageCount = ceil(TOTAL / perView) pages. Because the loop is infinite the
 * final page wraps back into the head of the list, exactly like swiper's
 * cloned slides:
 *   perView 3 -> 2 pages: [0,1,2] [3,4,0]
 *   perView 2 -> 3 pages: [0,1]   [2,3]   [4,0]
 *   perView 1 -> 5 pages: [0] [1] [2] [3] [4]
 * We render those clones literally: RENDERED items where item i is
 * workImages[i % TOTAL]. The last page needs index pageCount*perView-1, and
 * ceil(TOTAL/pv)*pv <= TOTAL + pv - 1, so TOTAL + MAX_PER_VIEW - 1 items are
 * always enough for every perView — the window is never short, at any width.
 *
 * The track is width:100% of the viewport box; its children overflow it
 * (shrink-0 at 1/perView each), so a translateX percentage resolves against
 * the *container* width. One page is exactly perView * (100/perView)% = 100%,
 * which is why the transform is -page*100% for every breakpoint.
 */

/* the slide widths below are plain CSS, but the page size (and therefore the
   dot count and the wrap point) has to be known in JS, so read the same two
   swiper breakpoints from matchMedia */
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

/*
 * The carousel itself (this component's second <section>, everything below)
 * is also reused, unstyled-heading-free, by the suburb pages' "Our Work In
 * Action" gallery (src/components/suburb/WorkInAction.tsx) — that page's own
 * heading uses a completely different treatment (43px flat, no responsive
 * variance, see that file's own citation) so it renders its own heading
 * separately and only needs the carousel/container piece below. Extracted as
 * WorkCarouselGallery so this file's default export (used by /home, heading
 * included) is unchanged byte-for-byte.
 */
export function WorkCarouselGallery({ workImages }: { workImages: string[] }) {
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
                          src={workImages[i % TOTAL]}
                          alt=""
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

/* Default export unchanged: the heading section (verbatim, byte-identical to
   before this file's carousel body was extracted above) plus the extracted
   gallery. Used by /home only. */
export default function WorkCarousel({ workImages }: { workImages: string[] }) {
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
