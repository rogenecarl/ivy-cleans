"use client";

import { useState } from "react";
import type { ContactData } from "@/data/contact";
import { submitLeadAction } from "@/app/(sites)/[city]/lead-actions";

/*
 * Reproduction of contact.html's #30bda89 Elementor form
 * (elementor-widget-form, "New Form"). Deliberate deviation from live: the
 * live markup is `<form class="elementor-form" method="post" name="New Form"
 * aria-label="New Form">` — this clone drops `method`/`name` (there's
 * nowhere for a POST to go) and keeps only `aria-label="New Form"`, per the
 * task brief. The four WP-plumbing hidden fields
 * (post_id/form_id/referer_title/queried_id) are display-irrelevant and are
 * intentionally omitted rather than faked.
 *
 * Submit is intercepted client-side (mirrors BookingForm.tsx's approach —
 * see that file for the honeypot/pending/per-field-error rationale): a
 * hidden `website_url` honeypot field is added before the submit row, and
 * the field-name expression already used for each control's `name` attribute
 * doubles as the key into the per-field error map returned by
 * submitLeadAction.
 *
 * Field set/order/ids/placeholders/required verbatim from contact.html:
 * Name (text, optional) + Email (email, required) sit side by side
 * (elementor-col-50 each); Phone Number (text), the cleaning-project
 * dropdown (select, required), and the "How Can We Help?" textarea are each
 * full width (elementor-col-100) below them, matching the live
 * two-then-stacked field layout. The reCAPTCHA v3 field
 * (#form-field-field_dc813df) is invisible on the live page (badge
 * "bottomright", size "invisible") and isn't reproduced.
 *
 * post-34.css (#30bda89): labels 1.6rem/#37745F with padding-bottom 0.5rem;
 * fields 1.6rem/#000 on white, #D1D5DB border, 5px radius; submit button
 * 1.8rem, #BF360C (rust) fill, white text. The grid comes from the same
 * block: `.elementor-field-group{padding:0 5px;margin-bottom:10px}` over
 * `.elementor-form-fields-wrapper{margin:0 -5px -10px}` — i.e. a literal
 * 10px gutter/row gap in px, not rem, at every width.
 *
 * Everything post-34.css is silent about (Elementor's uncaptured base form
 * CSS) is measured off the live DOM instead — probe at 1440 (root 8.32px):
 *   label     line-height 1em, padding-bottom 4.16px (0.5rem), height 17.5
 *   input     padding 4.16px 8.32px (0.5rem 1rem), line-height 1.4em,
 *             min-height 40px (Elementor's `elementor-size-sm`), height 40
 *   select    padding 5px 20px 5px 14px, min-height 40px, height 40
 *   textarea  padding 5px 14px, line-height 1.4em, rows=4 -> height 86.5
 *   button    padding 9.152px 19.968px (1.1rem 2.4rem), 1.8rem/700
 *             uppercase, radius 5px, 1px currentColor (white) border,
 *             min-height 40px -> 81.9x40, right-aligned in its own row
 * The button's 1px white border is invisible against the white column but is
 * reproduced because it is load-bearing for the 40px x 81.9px box. The fields
 * are `block` for the same reason the live ones are: as inline-level boxes
 * their line box adds ~3.5px of descender slack under the textarea and
 * pushes the submit row down.
 */
const HALF_WIDTH_IDS = new Set(["form-field-name", "form-field-email"]);

const FIELD_BASE =
  "block w-full min-h-[40px] rounded-[5px] border border-[#D1D5DB] bg-white text-[1.6rem] text-black";
const INPUT_CLASS = `${FIELD_BASE} px-[1rem] py-[0.5rem] leading-[1.4em]`;
const SELECT_CLASS = `${FIELD_BASE} py-[5px] pr-[20px] pl-[14px]`;
const TEXTAREA_CLASS = `${FIELD_BASE} px-[14px] py-[5px] leading-[1.4em]`;

/*
 * The live select does not use the browser's own control arrow: captured in
 * the same Chromium build, ivycleans.com paints a solid black triangle
 * (~11x7, right edge ~10px inside the field) where an untouched <select>
 * shows Chrome's thin chevron — i.e. Elementor suppresses the native
 * appearance and draws its own glyph. Reproduced as a background SVG so the
 * field reads the same; the 20px right padding above keeps text clear of it.
 */
const SELECT_ARROW: React.CSSProperties = {
  appearance: "none",
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 11 7'%3E%3Cpath fill='%23000' d='M0 0h11L5.5 7z'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  backgroundSize: "11px 7px",
};

export default function ContactFormDisplay({
  cityKey,
  contactFields,
  contactSubmitLabel,
  contactResult,
}: {
  cityKey: string;
  contactFields: ContactData["contactFields"];
  contactSubmitLabel: ContactData["contactSubmitLabel"];
  contactResult: ContactData["contactResult"];
}) {
  const [result, setResult] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (result === "success" || result === "error") {
    const copy =
      result === "success"
        ? { heading: contactResult.successHeading, body: contactResult.successBody }
        : { heading: contactResult.errorHeading, body: contactResult.errorBody };
    return (
      <div className="py-[2rem]">
        <h3 className="text-herogreen mb-[1rem] text-[2rem] leading-[1.2em] font-semibold">
          {copy.heading}
        </h3>
        <p className="text-[1.6rem] leading-[1.5em]">{copy.body}</p>
      </div>
    );
  }

  return (
    <form
      aria-label="New Form"
      className="flex flex-wrap gap-[10px]"
      onSubmit={async (e) => {
        e.preventDefault();
        if (result === "pending") return;
        setResult("pending");
        setFieldErrors({});
        const data = new FormData(e.currentTarget);
        const outcome = await submitLeadAction("contact", cityKey, data);
        if (outcome.ok) {
          setResult("success");
          return;
        }
        if (outcome.error === "validation") {
          setFieldErrors(outcome.fieldErrors);
          setResult("idle");
          return;
        }
        setResult("error");
      }}
    >
      {contactFields.map((field) => {
        const name = `form_fields[${field.id.replace("form-field-", "")}]`;
        return (
          <div
            key={field.id}
            className={
              HALF_WIDTH_IDS.has(field.id)
                ? "w-full md:w-[calc(50%-5px)]"
                : "w-full"
            }
          >
            <label
              htmlFor={field.id}
              className="text-herogreen block pb-[0.5rem] text-[1.6rem] leading-[1em]"
            >
              {field.label}
            </label>
            {field.kind === "select" ? (
              <select
                id={field.id}
                name={name}
                required={field.required}
                className={SELECT_CLASS}
                style={SELECT_ARROW}
              >
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.kind === "textarea" ? (
              <textarea
                id={field.id}
                name={name}
                placeholder={field.placeholder}
                rows={field.rows}
                required={field.required}
                className={TEXTAREA_CLASS}
              />
            ) : (
              <input
                id={field.id}
                name={name}
                type={field.kind}
                placeholder={field.placeholder}
                required={field.required}
                className={INPUT_CLASS}
              />
            )}
            {fieldErrors[name] && (
              <p className="mt-[0.5rem] text-[1.4rem] text-rust">{fieldErrors[name]}</p>
            )}
          </div>
        );
      })}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website_url">Leave this field empty</label>
        <input
          id="website_url"
          name="form_fields[website_url]"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div className="flex w-full justify-end">
        <button
          type="submit"
          disabled={result === "pending"}
          className={`min-h-[40px] rounded-[5px] border border-white bg-[#BF360C] px-[2.4rem] py-[1.1rem] text-[1.8rem] leading-[1.2em] font-bold text-white uppercase${result === "pending" ? " opacity-70" : ""}`}
        >
          {contactSubmitLabel}
        </button>
      </div>
    </form>
  );
}
