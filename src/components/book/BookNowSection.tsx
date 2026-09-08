import type { BookData } from "@/data/book";
import BookingForm from "@/components/book/BookingForm";

// book-now.html, post-2336.css: section 925b984 padding 4rem 0 (2rem mobile), 132rem container (post-2338 unscoped rule),
// column 501fff5 centred, form a295442 50% / 80% / 100%, #40907A, 5% padding, 8px radius, 10px margin mobile.
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
