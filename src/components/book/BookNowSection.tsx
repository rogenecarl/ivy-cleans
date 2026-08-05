import BookingForm from "@/components/book/BookingForm";

/*
 * book-now.html's sole page-content section (elementor-element-925b984,
 * column elementor-element-501fff5, form widget elementor-element-a295442) —
 * no page heading, matching book-now-content-dump.txt which jumps straight
 * from the nav to the form labels. post-2336.css:
 *   #925b984  padding 4rem 0 (desktop/tablet) -> 2rem 0 (<=767px only —
 *     there is no separate 1024px-breakpoint override, so 768-1024 shares
 *     the desktop value); no left/right padding at any width, so the
 *     section relies on the kit's default boxed container (max-width
 *     119rem — post-6.css `.elementor-section-boxed >
 *     .elementor-container{max-width:119rem}`, NOT the front page's
 *     page-specific 132rem `.ec` value, since that override lives in
 *     post-2035.css and is scoped to page 2035 only).
 *   #501fff5  `.elementor-widget-wrap{justify-content:center}` centers the
 *     single form widget within the full-width column.
 *   #a295442  the widget itself: width 50% max-width 50% (desktop)
 *     -> 80% (<=1024px) -> 100% (<=767px); its `.elementor-widget-container`
 *     (the colored box) is background #40907A, padding 5% all sides,
 *     border-radius 8px, plus an extra 10px outer margin at <=767px (this
 *     margin is the only source of edge spacing at mobile — the section
 *     itself carries none).
 * Tailwind breakpoints per globals.css: default = live's <=767px, md: =
 * live's 768-1024px band, lg: = live's >=1025px (desktop).
 */
export default function BookNowSection() {
  return (
    <section className="py-[2rem] md:py-[4rem]">
      <div className="mx-auto flex max-w-[119rem] justify-center">
        <div className="w-full max-md:m-[10px] md:w-4/5 lg:w-1/2">
          <div className="rounded-[8px] bg-[#40907A] p-[5%]">
            <BookingForm size="md" />
          </div>
        </div>
      </div>
    </section>
  );
}
