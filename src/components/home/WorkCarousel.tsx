"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { workImages } from "@/data/home";
import { ChevronRightIcon } from "@/components/Icons";

/*
 * Section 3eef65e is an Elementor image-carousel, not a single-image viewer.
 * Live @1440 the track measures 1185px centred (slides at x=128/523/918, each
 * 395x296) and @390 it is the container's own 370px with one slide — i.e.
 * three slides per view on desktop, one on mobile, 4:3 art either way. The
 * section measures 395px tall at both widths: 32/42px above the slides and
 * 67/75px of pagination space below.
 *
 * Widget 741355c data-settings: slides_to_show 3, slides_to_scroll 3,
 * infinite yes, autoplay yes @5000ms, pause_on_hover yes, pause_on_interaction
 * yes, navigation "both" (arrows + dots), speed 500. No *_tablet / *_mobile
 * keys, so Elementor's image-carousel responsive defaults apply: 2-up on
 * tablet, 1-up on mobile.
 */
const TOTAL = workImages.length; // 5
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
const RENDERED = TOTAL + MAX_PER_VIEW - 1; // 7

/* the slide widths below are plain CSS, but the page size (and therefore the
   dot count and the wrap point) has to be known in JS, so read the same two
   breakpoints from matchMedia */
const QUERIES = ["(min-width: 1024px)", "(min-width: 768px)"];

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

export default function WorkCarousel() {
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
      <div className="ec">
        <h2 className="text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[1rem] md:text-[4rem] lg:text-[4.5rem]">
          Our Cleaning Work In Action
        </h2>
      </div>
      <div
        className="relative mx-auto max-w-[390px] px-[10px] pt-[42px] pb-[75px] md:max-w-[790px] lg:max-w-[1185px] lg:px-0 lg:pt-[32px] lg:pb-[67px]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        role="region"
        aria-roledescription="carousel"
        aria-label="Image Carousel"
      >
        <div className="overflow-hidden">
          <div
            className={`flex w-full ${instant ? "" : "transition-transform duration-500 ease-out"}`}
            style={{ transform: `translateX(-${page * 100}%)` }}
          >
            {Array.from({ length: RENDERED }, (_, i) => (
              <div key={i} className="w-full shrink-0 md:w-1/2 lg:w-1/3">
                <Image
                  src={workImages[i % TOTAL]}
                  alt=""
                  width={800}
                  height={600}
                  className="aspect-[395/296] w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => goTo(page - 1, true)}
          aria-label="Previous image"
          className="absolute top-1/2 left-[-1.5rem] flex h-[3.4rem] w-[3.4rem] -translate-y-1/2 items-center justify-center text-[#3f444b]"
        >
          <ChevronRightIcon className="h-[1.8rem] w-[1.8rem] rotate-180" />
        </button>
        <button
          onClick={() => goTo(page + 1, true)}
          aria-label="Next image"
          className="absolute top-1/2 right-[-1.5rem] flex h-[3.4rem] w-[3.4rem] -translate-y-1/2 items-center justify-center text-[#3f444b]"
        >
          <ChevronRightIcon className="h-[1.8rem] w-[1.8rem]" />
        </button>
        {/* navigation "both" => swiper's dots, sitting in the pagination space
            below the slides (elementor-pagination-position-outside) */}
        <div className="absolute inset-x-0 bottom-[30px] flex justify-center gap-[8px] lg:bottom-[26px]">
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
    </section>
  );
}
