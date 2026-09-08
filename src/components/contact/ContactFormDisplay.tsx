"use client";

import { useState } from "react";
import type { ContactData } from "@/data/contact";
import { submitLeadAction } from "@/app/(sites)/[city]/lead-actions";

// contact.html form 30bda89. No method/name; submit is intercepted client-side with a honeypot, like BookingForm.
// Fields verbatim: Name + Email side by side, then Phone, project select, message. reCAPTCHA not reproduced.
// post-34.css: labels 1.6rem #37745F, fields 1.6rem #D1D5DB border 5px radius, submit 1.8rem rust; 10px px gutters.
const HALF_WIDTH_IDS = new Set(["form-field-name", "form-field-email"]);

const FIELD_BASE =
  "block w-full min-h-[40px] rounded-[5px] border border-[#D1D5DB] bg-white text-[1.6rem] text-black";
const INPUT_CLASS = `${FIELD_BASE} px-[1rem] py-[0.5rem] leading-[1.4em]`;
const SELECT_CLASS = `${FIELD_BASE} py-[5px] pr-[20px] pl-[14px]`;
const TEXTAREA_CLASS = `${FIELD_BASE} px-[14px] py-[5px] leading-[1.4em]`;

// live suppresses the native select arrow and paints its own triangle; reproduced as a background SVG
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
