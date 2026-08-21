import { Lato, Roboto } from "next/font/google";
import type { BookData } from "@/data/book";
import BookingForm from "@/components/book/BookingForm";
import { PhoneIcon } from "@/components/Icons";

/*
 * book.html's two page-content sections. Values are post-189.css rules
 * (elementor id -> rule) confirmed against a five-width live DOM probe stored
 * in fidelity-r9/live-book.json + live-book-f3.json (round 9, task 3).
 *
 *   #dd04aea (header band)  background #EEF7F4; padding 8.6rem 0 3.8rem 0
 *     (desktop) -> 3rem 0 2rem 0 (<=1024px) -> 2rem 0 1rem 0 (<=767px).
 *     Its boxed container is the kit's 119rem + the widget-wrap's own 10px
 *     gutter, i.e. exactly globals.css's `.tpl-inner .ec` (live probe: the
 *     container measures 1190px and the headings start at x=375 / width 1170
 *     at a 1920 viewport — the old `mx-auto max-w-[119rem]` was missing that
 *     10px, so every heading sat 10px left and the band was 20px short).
 *   #bd93938 (h3 overline)  widget-container margin 0 0 -0.5rem 0 against the
 *     kit's 2rem widget spacing = a 1.5rem gap; text 1.6rem/600 uppercase,
 *     color #BF360C/rust.
 *   #324e8c5 (h2 "Book Now")  3.6rem/600 -> 2.8rem (<=1024px) -> 2.5rem
 *     (<=767px), color #37745F/herogreen.
 *   #5315b8e7 (form band)  `.elementor-container{max-width:1400px}` (a literal
 *     px override, kept as px per the ladder-aware convention); padding
 *     0% 0% 5% 0%.
 *   #6870e8f4 (column)  `.elementor-widget-wrap{justify-content:center}`, and
 *     the widget-wrap's 10px gutter — replaced at <=767px by
 *     `padding:19% 0% 0% 0%` (probe: 74.09px top / 0 sides at 390).
 *   #6d970af1 (lead-in heading)  Lato 45px/900, line-height 1.2em, color #000,
 *     centered; 35px at <=767px. Literal px, not the rem ladder (probe: 45px
 *     at both the 10px and 8.32px root steps).
 *   #30422d1e (lead-in copy)  Roboto 16px/400, centered. NB the rule also says
 *     `line-height:1px` (1em at <=767px) but that never reaches the text: the
 *     theme's own `p` rule wins, and the live paragraphs measure line-height
 *     24px at every width. Each <p> carries the kit's 2rem bottom margin.
 *     Colour is the theme default #374151, not this clone's `body{color:#000}`,
 *     so it is set explicitly here.
 *   #5dafbb39 (Call Now)  centered; button bg #6474f3, kit button styling
 *     (Poppins 700 uppercase, 1.5rem... no: font-size is Elementor's own 15px
 *     literal, padding 1.1rem 2.4rem, radius 5px, 1px solid currentColor).
 *   #3ef7408c (form widget)  width 50% (max-width 50%) at every width down to
 *     768 -> 100% at <=767px. post-189.css has NO 1024px width step (unlike
 *     /book-now's 80%), so 1024 and 768 are still 50% — live probe: 502px of a
 *     1004px column at 1024, 374px of 748px at 768. Its widget-container is
 *     background #ECECEC, padding 5%, no border-radius, +10px margin <=767px.
 *
 * Responsive-visibility trap: #5dafbb39's `elementor-hidden-desktop
 * elementor-hidden-tablet` reads like "mobile only", but this kit has
 * Elementor Pro's extra breakpoints enabled. custom-frontend.min.css (fetched
 * live, saved at fidelity-r9/elementor-frontend.css) defines
 *   mobile <=767 | tablet 768-1024 | tablet_extra 1025-1280 |
 *   laptop 1281-1440 | desktop >=1441
 * so the two hidden-* classes only blank out 768-1024 and >=1441. The button
 * IS visible from 1025 to 1440 — confirmed by probe (display:block at a 1440
 * viewport, display:none at 1920/1024/768, block at 390). Reproduced verbatim
 * below as `md:max-lg:hidden 2xl:hidden`; it is a live authoring quirk, not a
 * transcription mistake.
 *
 * Tailwind breakpoints per globals.css: default = live's <=767px, md: =
 * live's 768-1024px band, lg: = live's >=1025px, xl: >=1281, 2xl: >=1441.
 */
const lato = Lato({ subsets: ["latin"], weight: ["900"], variable: "--font-lato" });
const roboto = Roboto({ subsets: ["latin"], variable: "--font-roboto" });

export default function BookSection({
  bookHeader,
  bookLeadIn,
  bookCallNow,
  bookFields,
  bookSubmitLabel,
  comingSoon,
  cityKey,
}: {
  bookHeader: BookData["bookHeader"];
  bookLeadIn: BookData["bookLeadIn"];
  bookCallNow: BookData["bookCallNow"];
  bookFields: BookData["bookFields"];
  bookSubmitLabel: BookData["bookSubmitLabel"];
  comingSoon: BookData["comingSoon"];
  cityKey: string;
}) {
  return (
    <div className={`${lato.variable} ${roboto.variable}`}>
      <section className="bg-[#EEF7F4] pt-[2rem] pb-[1rem] md:pt-[3rem] md:pb-[2rem] lg:pt-[8.6rem] lg:pb-[3.8rem]">
        <div className="ec">
          <h3 className="text-rust mb-[1.5rem] text-[1.6rem] leading-[1.2em] font-semibold uppercase">
            {bookHeader.overline}
          </h3>
          <h2 className="text-herogreen text-[2.5rem] leading-[1.2em] font-semibold md:text-[2.8rem] lg:text-[3.6rem]">
            {bookHeader.h2}
          </h2>
        </div>
      </section>
      <section className="pb-[5%]">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-wrap justify-center max-md:pt-[19%] md:p-[10px]">
            {/* #6d970af1 */}
            <div className="mb-[2rem] w-full text-center">
              {/* `leading-*!` per the CtaBand/InnerFooter precedent: globals.css's
                  unlayered `p { line-height: 1.5 }` outranks any layered utility. */}
              <p className="mb-[2rem] font-[family-name:var(--font-lato)] text-[35px] leading-[1.2em]! font-black text-black md:text-[45px]">
                {bookLeadIn.heading}
              </p>
            </div>
            {/* #30422d1e */}
            <div className="mb-[2rem] w-full text-center font-[family-name:var(--font-roboto)] text-[16px] leading-[24px] font-normal text-[#374151]">
              <p className="mb-[2rem]">{bookLeadIn.intro}</p>
              <p className="mb-[2rem]">
                <strong>{bookLeadIn.callPrompt}</strong>
              </p>
              <p className="mb-[2rem]">
                <strong>{bookLeadIn.hours}</strong>
              </p>
              <p className="mb-[2rem]">
                <a
                  href={bookLeadIn.phoneHref}
                  className="text-link font-normal leading-[1.2em] font-[family-name:var(--font-poppins)]"
                >
                  <strong>{bookLeadIn.phone}</strong>
                </a>
              </p>
            </div>
            {/* #5dafbb39 — see the responsive-visibility note above */}
            <div className="mb-[2rem] w-full text-center md:max-lg:hidden 2xl:hidden">
              <a
                href={bookCallNow.href}
                className="inline-block rounded-[5px] border border-current bg-[#6474f3] px-[2.4rem] py-[1.1rem] text-[15px] leading-[1.2em] font-bold text-white uppercase"
              >
                <span className="flex flex-row items-center justify-center gap-[5px]">
                  <PhoneIcon className="h-[1em] w-[1em]" />
                  <span>{bookCallNow.label}</span>
                </span>
              </a>
            </div>
            {/* #3ef7408c */}
            <div className="w-full md:w-1/2">
              <div className="bg-[#ECECEC] p-[5%] max-md:m-[10px]">
                <BookingForm
                  size="sm"
                  bookFields={bookFields}
                  bookSubmitLabel={bookSubmitLabel}
                  comingSoon={comingSoon}
                  cityKey={cityKey}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
