import { Lato, Roboto } from "next/font/google";
import type { BookData } from "@/data/book";
import BookingForm from "@/components/book/BookingForm";
import { PhoneIcon } from "@/components/Icons";

// book.html, post-189.css: header band dd04aea (#EEF7F4, 8.6rem 0 3.8rem / 3rem 0 2rem / 2rem 0 1rem), overline bd93938, h2 324e8c5;
// form band 5315b8e7 (1400px, 5% bottom), lead-in 6d970af1 Lato 45px/900 (35px mobile), copy 30422d1e Roboto 16px;
// Call Now 5dafbb39 (#6474f3, visible 1025-1440 only — Elementor Pro breakpoints); form 3ef7408c 50% / 100% mobile, #ECECEC, 5% padding.
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
