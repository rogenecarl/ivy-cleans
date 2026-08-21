import type { BookData } from "@/data/book";
import BookingForm from "@/components/book/BookingForm";

/*
 * book-now.html's sole page-content section (elementor-element-925b984,
 * column elementor-element-501fff5, form widget elementor-element-a295442) —
 * no page heading and no lead-in copy, matching book-now-content-dump.txt,
 * which jumps straight from the nav to the form labels. Values from
 * post-2336.css, confirmed against the five-width live probe in
 * fidelity-r9/live-booknow.json + live-booknow-f3.json.
 *   #925b984  padding 4rem 0 (desktop/tablet) -> 2rem 0 (<=767px only — there
 *     is no 1024px step, so 768-1024 shares the desktop value).
 *   boxed container  132rem, NOT the kit's 119rem. post-2338.css (the header
 *     template every (front)-group page loads) ends with an UNSCOPED custom-CSS
 *     block: `body .elementor-section.elementor-section-boxed >
 *     .elementor-container { max-width: 132rem; }`. Live probe agrees — the
 *     container measures 1320px at 1920 and 1098.24px at the 1440 (8.32px root)
 *     step. That plus the widget-wrap's own 10px gutter is exactly
 *     globals.css's `.ec`, so the earlier `max-w-[119rem]` was 130px too narrow
 *     at 1920 (form widget 595px vs live's 650px).
 *   #501fff5  `.elementor-widget-wrap{justify-content:center}` centers the
 *     single form widget within the full-width column.
 *   #a295442  width 50% max-width 50% (desktop) -> 80% (<=1024px) -> 100%
 *     (<=767px); its `.elementor-widget-container` (the colored box) is
 *     background #40907A, padding 5%, border-radius 8px, plus a 10px margin at
 *     <=767px (the only source of edge spacing at mobile — the section itself
 *     carries none).
 * Tailwind breakpoints per globals.css: default = live's <=767px, md: =
 * live's 768-1024px band, lg: = live's >=1025px (desktop).
 */
export default function BookNowSection({
  bookFields,
  bookSubmitLabel,
  comingSoon,
  cityKey,
}: {
  bookFields: BookData["bookFields"];
  bookSubmitLabel: BookData["bookSubmitLabel"];
  comingSoon: BookData["comingSoon"];
  cityKey: string;
}) {
  return (
    <section className="py-[2rem] md:py-[4rem]">
      <div className="ec flex flex-wrap justify-center">
        <div className="w-full md:w-4/5 lg:w-1/2">
          <div className="rounded-[8px] bg-[#40907A] p-[5%] max-md:m-[10px]">
            <BookingForm
              size="md"
              bookFields={bookFields}
              bookSubmitLabel={bookSubmitLabel}
              comingSoon={comingSoon}
              cityKey={cityKey}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
