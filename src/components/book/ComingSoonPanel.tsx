import type { BookData } from "@/data/book";

/*
 * Shown by BookingForm in place of the field list after submit.
 *
 * Two states. `success` is the normal path. `error` reuses the original
 * call/email fallback copy, and is shown ONLY when the lead did not survive:
 * a storage failure or a rate-limit rejection. A failed notification email is
 * NOT an error here, because the lead is saved either way.
 */
export default function SubmitResultPanel({
  comingSoon,
  state,
}: {
  comingSoon: BookData["comingSoon"];
  state: "success" | "error";
}) {
  if (state === "success") {
    return (
      <div className="text-center">
        <h3 className="text-herogreen mb-[1.5rem] text-[2.4rem] leading-[1.2em] font-semibold">
          {comingSoon.successHeading}
        </h3>
        <p className="text-[1.6rem] leading-[1.5em]">{comingSoon.successBody}</p>
      </div>
    );
  }

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
