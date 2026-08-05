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
 *   - KNOWN STRUCTURAL GAP (round 9, task 3): the LIVE form is a THREE-STEP
 *     wizard, not the flat 10-field form below. The static HTML hides this —
 *     it ships three `elementor-field-type-step` markers (field_0d33c95,
 *     field_d94c058, field_7ed6c95, book.html:348/402/420) that Elementor's
 *     form-steps JS turns into `.e-form__step` panes at runtime. Live probe
 *     (fidelity-r9/live-book-f3.json, screenshots live-*-f3-1920.png): a
 *     40px step-indicator bar, step 1 = service/condition/bedrooms/bathrooms
 *     with a full-width NEXT button, steps 2 and 3 `display:none`. Building
 *     the wizard was out of this task's scope (brief: "styling only"), so the
 *     per-element metrics below are trued up to live while the field COUNT
 *     visible at once still differs. Flagged for a follow-up round.
 *
 * Every number below is from post-2336.css / post-189.css cross-checked
 * against a five-width live DOM probe (fidelity-r9/live-booknow-f3.json,
 * live-book-f3.json). Elementor's own control scale, which the scraped
 * post-*.css files do not contain, was fetched from the live
 * custom-frontend.min.css (fidelity-r9/elementor-frontend.css):
 *     .elementor-field-textual                 { min-height:40px; radius:3px;
 *                                                padding:5px 14px }   (= "sm")
 *     .elementor-field-textual.elementor-size-md{ min-height:47px; radius:4px;
 *                                                padding:6px 16px }
 *     .elementor-form .elementor-button.elementor-size-sm { min-height:40px }
 * Task 1's placeholder md height of 45px was therefore 2px short; the real
 * value is 47px (live probe agrees at all five widths).
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
  const md = size === "md";

  /*
   * Field-group gutter + row spacing.
   *   /book-now (#a295442): padding-inline calc(1.5rem/2), margin-bottom 4rem;
   *     fields-wrapper margin-inline calc(-1.5rem/2), margin-bottom -4rem.
   *     REM — live probe reads 7.5px/40px at the 10px root step and
   *     6.24px/33.28px at the 1440 (8.32px) step.
   *   /book (#3ef7408c): the same controls authored in px —
   *     calc(15px/2) and 40px, which the probe confirms stay 7.5px/40px at
   *     1440 too.
   */
  const wrapperClass = md
    ? "-mx-[0.75rem] -mb-[4rem]"
    : "-mx-[7.5px] -mb-[40px]";
  const groupClass = md ? "px-[0.75rem] mb-[4rem]" : "px-[7.5px] mb-[40px]";

  /*
   * Labels. /book-now: Poppins 1.6rem/600, line-height 1.2em, #FFFFFF.
   * /book: Roboto 14px/800, line-height 1 (both literal px on the live site —
   * 14px at the 8.32px root step too), #000000. Both: padding-bottom 10px
   * (Elementor's `.elementor-labels-above .elementor-field-group > label`).
   */
  const labelClass = md
    ? "block pb-[10px] text-[1.6rem] leading-[1.2em] font-semibold text-white"
    : "block pb-[10px] font-[family-name:var(--font-roboto)] text-[14px] leading-[1] font-extrabold text-black";

  /*
   * Controls.
   *   /book-now: Poppins 1.8rem/400 (1.6rem at <=767px), line-height 1.3em,
   *     color #000, bg #fff, border-width 0, radius 4px, min-height 47px,
   *     padding 6px 16px (selects: padding-inline-end 20px).
   *   /book: Roboto 15px/500, color #3F3F3F, bg #fff, border-width 0,
   *     radius 7px, min-height 40px. Its selects keep Elementor's literal
   *     5px/14px padding and inherit the kit's 1.5rem line-height, while its
   *     inputs take the theme's 0.5rem/1rem padding and line-height 1.4 —
   *     both confirmed by probe at the 10px and 8.32px root steps.
   */
  const fieldBase = md
    ? "block w-full min-h-[47px] rounded-[4px] border-0 bg-white text-[1.6rem] leading-[1.3em] font-normal text-black md:text-[1.8rem]"
    : "block w-full min-h-[40px] rounded-[7px] border-0 bg-white font-[family-name:var(--font-roboto)] text-[15px] font-medium text-[#3F3F3F]";
  const inputClass = md
    ? `${fieldBase} px-[16px] py-[6px]`
    : `${fieldBase} px-[1rem] py-[0.5rem] leading-[1.4]`;
  const selectClass = md
    ? `${fieldBase} py-[6px] pr-[20px] pl-[16px]`
    : `${fieldBase} py-[5px] pr-[20px] pl-[14px] leading-[1.5rem]`;

  /*
   * Submit button. Both widgets are authored with `"button_width":"100"` and
   * carry `elementor-button-align-stretch`, so the live button spans the whole
   * field group (probe: 585px of a 585px field column on /book-now, 621px of
   * 621px on /book) — it is NOT the right-aligned pill this component used to
   * render. Its box comes from the kit (post-6.css `.elementor-kit-6 button`):
   * Poppins 700 uppercase, line-height 1.2em, border 1px solid,
   * border-radius 5px, padding 1.1rem 2.4rem; the height floor is
   * Elementor's `.elementor-form .elementor-button.elementor-size-sm`
   * (min-height 40px) — both pages' submit buttons are size-sm
   * (book.html:449, book-now.html:480).
   * Colours:
   *   post-2336.css #a295442 -> font-size 2.4rem, bg/border #BF360C
   *     (--color-rust), hover bg #FFFFFF / text #BF360C.
   *   post-189.css #3ef7408c -> bg #6474f3, color #ffffff; no font-size rule,
   *     so Elementor's own `.elementor-button{font-size:15px}` applies (probe:
   *     15px at every width, including the 8.32px root step). Hover only
   *     restates color:#ffffff — a no-op — so no hover classes. No
   *     border-color is ever set, so it falls back to `currentcolor` = the
   *     rule's own #ffffff.
   */
  const buttonClass = md
    ? "border-rust bg-rust text-white hover:bg-white hover:text-rust text-[2.4rem]"
    : "border-white bg-[#6474f3] text-white text-[15px]";

  if (submitted) {
    return <ComingSoonPanel />;
  }

  return (
    <form
      aria-label="New Form"
      className={`flex flex-wrap ${wrapperClass}`}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      {bookFields.map((field) => (
        <div
          key={field.id}
          className={`${groupClass} ${
            HALF_WIDTH_IDS.has(field.id) ? "w-full md:w-1/2" : "w-full"
          }`}
        >
          <label htmlFor={field.id} className={labelClass}>
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
      <div className={`${groupClass} w-full`}>
        <button
          type="submit"
          className={`${buttonClass} block min-h-[40px] w-full rounded-[5px] border px-[2.4rem] py-[1.1rem] leading-[1.2em] font-bold uppercase transition-colors`}
        >
          {bookSubmitLabel}
        </button>
      </div>
    </form>
  );
}
