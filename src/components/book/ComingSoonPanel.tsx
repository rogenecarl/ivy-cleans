import type { BookData } from "@/data/book";

// Shown after submit. `error` only when the lead was not saved (storage failure or rate limit); a failed email is not an error.
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
        {comingSoon.errorHeading}
      </h3>
      <p className="text-[1.6rem] leading-[1.5em]">
        Please call us at{" "}
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
