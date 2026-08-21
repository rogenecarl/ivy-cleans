import type { SuburbData } from "@/data/suburb";
import { WorkCarouselGallery } from "@/components/home/WorkCarousel";

/*
 * Heading section 2a36e1a1/6ca850f2 (post-664.css): the h3 has NO responsive
 * override at all — a single flat declaration, font-size:43px (literal PX,
 * not rem — reproduced as px per the repo's px-stays-px rule) and a uniform
 * 10px widget-container margin on every side. No page-specific font-weight
 * or color override exists for this id — task-3 fidelity pass corrected an
 * earlier (task-2) assumption here: this widget does NOT keep "bold, black"
 * like other unstyled headings on this page (those all carry an explicit
 * `color:#000000` in their own per-id CSS — see Benefits.tsx/HouseCleaning.tsx
 * — this one does not). With no override, it falls through to the KIT's
 * OWN defaults: post-6.css's `.elementor-kit-6 h3{font-weight:600}` (h3 is
 * the only heading level with a 600 default; h1/h2/h4 default to 700) and
 * `.elementor-kit-6{color:#374151}` (the kit's base text color, applied to
 * the whole page unless a widget overrides it — this repo's own `body{color:
 * #000}` in globals.css is a deliberate site-wide simplification that this ONE
 * widget must opt out of, confirmed by live computed-style probes at 1920/
 * 1440/1280/1025/768/390: font-weight 600, color rgb(55,65,81) at every
 * width). Also confirmed WorkInAction's own last-widget-in-its-wrap margin
 * (10px all sides, unaffected by the kit's `.elementor-widget:not(:last-
 * child){margin-block-end:2rem}` widget-spacing rule — this h3 IS the last
 * child, so that rule does not apply here, unlike the other 5 headings on
 * this page; see their own components for that fix) is already byte-correct.
 *
 * Gallery section 4540d233/777c3582: post-8.css pins the SAME container
 * (max-width:1205px, min-height:395px) and the SAME carousel settings
 * (slides_to_show 3, slides_to_scroll 3, autoplay, navigation both) for the
 * /home page's identical widget.
 *
 * TASK-3 ADJUDICATION (carried concern from task-2's report): task-2 shipped
 * a static wrapping row here instead of a real carousel, reasoning that
 * suburb components should stay server-only "since hundreds of these pages
 * will exist per city." A live probe at 1920/1440/1280/1025/768/390 shows
 * that reasoning produced a real, large fidelity defect: the live gallery
 * section is a flat 395px tall at every width (min-height:395px, unconditional,
 * only 1/2/3 images ever visible depending on width), but rendering all 5
 * images in a static wrapping row instead produces a section up to 3.6x
 * taller (1432px at 390px width) — a defect no CSS tweak can close, since
 * the geometry itself is wrong (more rows of content than the live page ever
 * shows at once). The brief calls for picking "the cheapest faithful option"
 * between matching the static render's geometry to the live initial state OR
 * implementing the carousel — geometry-matching isn't achievable without a
 * carousel (there is no way to show only 1/2/3 of 5 images in a static
 * layout without either cropping content or building paging logic, i.e.
 * building a carousel anyway), so this fidelity pass switches to the
 * carousel. Cost: `src/components/home/WorkCarousel.tsx` already implements
 * this exact carousel (SAME container id family, SAME settings, proven by
 * its own citation and already shipped for /home) — its carousel body
 * (excluding /home's own differently-styled heading) is extracted as the
 * named export `WorkCarouselGallery`, reused here unchanged. This adds a
 * small "use client" leaf per suburb page (the same one /home already
 * ships), not a page-wide client conversion — SuburbPage itself and every
 * other section stay server components; only this one gallery hydrates.
 */
export default function WorkInAction({
  workInAction,
}: {
  workInAction: SuburbData["workInAction"];
}) {
  return (
    <>
      <section>
        <div className="ec">
          <h3 className="m-[10px] text-center text-[43px] leading-[1.2em] font-semibold text-[#374151]">
            {workInAction.heading}
          </h3>
        </div>
      </section>
      <WorkCarouselGallery workImages={workInAction.images} />
    </>
  );
}
