"use client";

import { useState } from "react";
import { bookFields, bookSubmitLabel } from "@/data/book";
import ComingSoonPanel from "@/components/book/ComingSoonPanel";

/*
 * Shared renderer for the identical 10-field Elementor form on both
 * /book-now (#a295442, elementor-size-md) and /book (#3ef7408c,
 * elementor-size-sm) — see src/data/book.ts for the field-by-field grep
 * verification against book-now.html / book.html. The two pages' markup is
 * otherwise the same form, so `size` is the only axis this component needs.
 *
 * Deviations from the live markup, mirroring ContactFormDisplay.tsx's
 * precedent for a display-only Elementor form:
 *   - `<form>` carries no `method`/`action`/`name` — there is nowhere for a
 *     live POST to go, and the four WP hidden inputs
 *     (post_id/form_id/referer_title/queried_id) are omitted as
 *     display-irrelevant.
 *   - This form IS interactive (unlike ContactFormDisplay): submit is
 *     intercepted client-side. `required` attributes are kept on every
 *     field marked required in the reference HTML so the browser's native
 *     validation still gates submission before ComingSoonPanel shows.
 *   - The bedrooms/bathrooms pair is the only elementor-col-50 pair in both
 *     forms (book.html:379,384 / book-now.html:410,415); every other field
 *     is elementor-col-100 (full width).
 *
 * Elementor's global size scale (elementor-size-sm/md, not present in the
 * scraped reference CSS — that lives in Elementor core's frontend
 * stylesheet, which wasn't captured) gives sm a 40px control min-height and
 * md 45px; used here as the two `size`-dependent field heights pending a
 * live-DOM fidelity pass in a later round.
 */
const HALF_WIDTH_IDS = new Set([
  "form-field-field_c4cfac1",
  "form-field-field_caacb3a",
]);

const SELECT_ARROW: React.CSSProperties = {
  appearance: "none",
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 11 7'%3E%3Cpath fill='%23000' d='M0 0h11L5.5 7z'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  backgroundSize: "11px 7px",
};

export default function BookingForm({ size }: { size: "md" | "sm" }) {
  const [submitted, setSubmitted] = useState(false);
  const minHeight = size === "md" ? "min-h-[45px]" : "min-h-[40px]";

  const fieldBase = `block w-full ${minHeight} rounded-[4px] border-0 bg-white text-[1.6rem] text-black`;
  const inputClass = `${fieldBase} px-[1rem] py-[0.5rem] leading-[1.4em]`;
  const selectClass = `${fieldBase} py-[5px] pr-[20px] pl-[14px]`;

  /*
   * Submit button color, per-page (deferred from Task 1's "size only covers
   * control sizing" note — resolved here since `size` already correlates
   * 1:1 with page: md only appears on /book-now, sm only on /book).
   * post-2336.css .elementor-element-a295442 .elementor-button[type=submit]:
   *   bg/border #BF360C (--color-rust), hover bg #FFFFFF / text #BF360C.
   * post-189.css .elementor-element-3ef7408c .elementor-button[type=submit]:
   *   bg #6474f3, color #ffffff; hover only restates color:#ffffff (a no-op
   *   against its own white text) — no background swap, so no hover classes
   *   here for the sm variant. No border-color is set in that CSS block, so
   *   border is kept the same #6474f3 as the background.
   */
  const buttonAccent =
    size === "md"
      ? "border-rust bg-rust text-white hover:bg-white hover:text-rust"
      : "border-[#6474f3] bg-[#6474f3] text-white";

  if (submitted) {
    return <ComingSoonPanel />;
  }

  return (
    <form
      aria-label="New Form"
      className="flex flex-wrap gap-x-[1.5rem] gap-y-[1.5rem]"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      {bookFields.map((field) => (
        <div
          key={field.id}
          className={
            HALF_WIDTH_IDS.has(field.id)
              ? "w-full sm:w-[calc(50%-0.75rem)]"
              : "w-full"
          }
        >
          <label
            htmlFor={field.id}
            className="block pb-[0.5rem] text-[1.6rem] leading-[1.2em] font-semibold"
          >
            {field.label}
          </label>
          {field.kind === "select" ? (
            <select
              id={field.id}
              name={field.name}
              required={field.required}
              className={selectClass}
              style={SELECT_ARROW}
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={field.id}
              name={field.name}
              type={field.kind}
              placeholder={field.placeholder}
              required={field.required}
              className={inputClass}
            />
          )}
        </div>
      ))}
      <div className="flex w-full justify-end">
        <button
          type="submit"
          className={`${buttonAccent} min-h-[40px] rounded-[4px] border px-[2.4rem] py-[1.1rem] text-[1.8rem] leading-[1.2em] font-bold uppercase transition-colors`}
        >
          {bookSubmitLabel}
        </button>
      </div>
    </form>
  );
}
