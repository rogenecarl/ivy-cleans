import { comingSoon } from "@/data/book";

/*
 * Shown by BookingForm in place of the field list once the (intercepted)
 * form is submitted. This copy is OUR content — book.ts's comment explains
 * why: both /book-now and /book post to a live WordPress form handler this
 * static clone can't reach, so there is no live "thank you" state to
 * reproduce. Styled with the site's existing rust/herogreen tokens
 * (src/app/globals.css --color-rust / --color-herogreen) rather than any
 * page-specific CSS, since no live markup exists for this state.
 */
export default function ComingSoonPanel() {
  return (
    <div className="text-center">
      <h3 className="text-herogreen mb-[1.5rem] text-[2.4rem] leading-[1.2em] font-semibold">
        {comingSoon.heading}
      </h3>
      <p className="text-[1.6rem] leading-[1.5em]">
        In the meantime, call us at{" "}
        <a href={comingSoon.phoneHref} className="text-rust hover:underline">
          {comingSoon.phone}
        </a>{" "}
        or email{" "}
        <a href={comingSoon.emailHref} className="text-rust hover:underline">
          {comingSoon.email}
        </a>
        .
      </p>
    </div>
  );
}
