import { bookHeader } from "@/data/book";
import BookingForm from "@/components/book/BookingForm";

/*
 * book.html's two page-content sections. post-189.css:
 *   #dd04aea (header band, kit-default 119rem container)  background
 *     #EEF7F4; padding 8.6rem 0 3.8rem 0 (desktop) -> 3rem 0 2rem 0
 *     (<=1024px) -> 2rem 0 1rem 0 (<=767px).
 *   #bd93938 (h3 overline "REQUEST OUR SERVICES")  widget-container margin
 *     0 0 -0.5rem 0; text 1.6rem/600 uppercase, color #BF360C/rust.
 *   #324e8c5 (h2 "Book Now")  text 3.6rem/600 (desktop) -> 2.8rem
 *     (<=1024px) -> 2.5rem (<=767px), color #37745F/herogreen. Same
 *     provenance and values as ContactHeader's "banner" variant (contact.html
 *     #e3d54f1/#cf79f67/#3567bdd) — this clone doesn't reuse that component
 *     since its data shape is contact-specific, but the pixel values match.
 *   #5315b8e7 (form band)  `.elementor-container{max-width:1400px}`
 *     (a literal px override, not a rem step — kept as px per the
 *     ladder-aware convention); padding 0% 0% 5% 0% (bottom only); no
 *     background_background setting, so it's plain white/transparent.
 *   #6870e8f4 (column)  `.elementor-widget-wrap{justify-content:center}`.
 *   #3ef7408c (form widget)  width 50% max-width 50% (desktop) -> 80%
 *     (<=1024px) -> 100% (<=767px); `.elementor-widget-container` (the
 *     colored box) is background #ECECEC, padding 5% all sides, NO
 *     border-radius (unlike /book-now's 8px), plus an extra 10px outer
 *     margin at <=767px.
 *
 * Scope note: the live page also renders a lead-in copy block (heading
 * #6d970af1 "A Couple of Questions For Your FREE Quote!", text-editor
 * #30422d1e "You're just 3 steps away..."/phone) and a mobile-only "Call
 * Now" button (#5dafbb39) between the H2 and the form — omitted here per
 * the round-9 task brief, which scopes this page to overline + H2 + form
 * only (see task-2-brief.md Step 2; also bookMeta.description in
 * src/data/book.ts already carries the lead-in heading's text verbatim as
 * the page's meta description).
 *
 * Tailwind breakpoints per globals.css: default = live's <=767px, md: =
 * live's 768-1024px band, lg: = live's >=1025px (desktop).
 */
export default function BookSection() {
  return (
    <>
      <section className="bg-[#EEF7F4] pt-[2rem] pb-[1rem] md:pt-[3rem] md:pb-[2rem] lg:pt-[8.6rem] lg:pb-[3.8rem]">
        <div className="mx-auto max-w-[119rem]">
          <h3 className="text-rust mb-[1.5rem] text-[1.6rem] leading-[1.2em] font-semibold uppercase">
            {bookHeader.overline}
          </h3>
          <h2 className="text-herogreen text-[2.5rem] leading-[1.2em] font-semibold md:text-[2.8rem] lg:text-[3.6rem]">
            {bookHeader.h2}
          </h2>
        </div>
      </section>
      <section className="pb-[5%]">
        <div className="mx-auto flex max-w-[1400px] justify-center">
          <div className="w-full max-md:m-[10px] md:w-4/5 lg:w-1/2">
            <div className="bg-[#ECECEC] p-[5%]">
              <BookingForm size="sm" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
