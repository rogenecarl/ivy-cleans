import type { BookData } from "@/site/data/book";
import BookingForm from "./BookingForm";
import { PhoneIcon } from "@/site/components/Icons";

// book-now.html, post-2336.css: section 925b984 padding 4rem 0 (2rem mobile), 132rem container, form a295442 #40907A,
// 5% padding, 8px radius, 10px margin mobile. book.html's lead-in sits beside the form from lg up, above it below lg.
export default function BookNowSection({
  heading,
  bookLeadIn,
  bookFields,
  bookSubmitLabel,
  comingSoon,
  cityKey,
}: {
  heading: string;
  bookLeadIn: BookData["bookLeadIn"];
  bookFields: BookData["bookFields"];
  bookSubmitLabel: BookData["bookSubmitLabel"];
  comingSoon: BookData["comingSoon"];
  cityKey: string;
}) {
  return (
    <section className="py-[2rem] md:py-[4rem]">
      <div className="ec grid items-start gap-[2.4rem] lg:grid-cols-[2fr_3fr] lg:gap-[4rem]">
        <div className="px-[6px] text-center lg:sticky lg:top-[2rem] lg:pt-[1rem] lg:text-left">
          <h1 className="text-rust mb-[1rem] text-[1.4rem] leading-[1.2em] font-semibold uppercase md:text-[1.6rem]">
            {heading}
          </h1>
          <p className="text-herogreen mb-[1.2rem] text-[2.6rem] leading-[1.2em]! font-semibold md:text-[3.6rem]">
            {bookLeadIn.heading}
          </p>
          <p className="mb-[2rem] text-[1.6rem] md:text-[1.8rem]">{bookLeadIn.intro}</p>
          <div className="mx-auto max-w-[42rem] rounded-[8px] bg-[#EEF7F4] p-[1.6rem] lg:mx-0 lg:p-[2rem]">
            <p className="text-[1.5rem] md:text-[1.6rem]">
              <strong>{bookLeadIn.callPrompt}</strong> <span className="max-lg:block">{bookLeadIn.hours}</span>
            </p>
            <a
              href={bookLeadIn.phoneHref}
              className="text-rust mt-[0.8rem] inline-flex items-center gap-[0.8rem] text-[2rem] font-semibold md:text-[2.4rem]"
            >
              <PhoneIcon className="h-[0.9em] w-[0.9em]" />
              {bookLeadIn.phone}
            </a>
          </div>
        </div>
        <div className="rounded-[8px] bg-[#40907A] p-[5%] max-md:m-[10px] lg:p-[3.2rem]">
          <BookingForm
            bookFields={bookFields}
            bookSubmitLabel={bookSubmitLabel}
            comingSoon={comingSoon}
            cityKey={cityKey}
          />
        </div>
      </div>
    </section>
  );
}
