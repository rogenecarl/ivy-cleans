"use client";

import { useState } from "react";
import type { BookData } from "@/data/book";
import SubmitResultPanel from "@/components/book/ComingSoonPanel";
import { submitLeadAction } from "@/app/(sites)/[city]/lead-actions";

// The 10-field form on /book-now (a295442, size md) and /book (3ef7408c, size sm).
// No method/action: submit is intercepted client-side. Live is a 3-step wizard; this is flat.
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

export default function BookingForm({
  size,
  bookFields,
  bookSubmitLabel,
  comingSoon,
  cityKey,
}: {
  size: "md" | "sm";
  bookFields: BookData["bookFields"];
  bookSubmitLabel: BookData["bookSubmitLabel"];
  comingSoon: BookData["comingSoon"];
  cityKey: string;
}) {
  const [result, setResult] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const md = size === "md";

  // field gutter + row spacing: /book-now in rem, /book in px
  const wrapperClass = md
    ? "-mx-[0.75rem] -mb-[4rem]"
    : "-mx-[7.5px] -mb-[40px]";
  const groupClass = md ? "px-[0.75rem] mb-[4rem]" : "px-[7.5px] mb-[40px]";

  // labels: /book-now Poppins 1.6rem/600 white; /book Roboto 14px/800 black
  const labelClass = md
    ? "block pb-[10px] text-[1.6rem] leading-[1.2em] font-semibold text-white"
    : "block pb-[10px] font-[family-name:var(--font-roboto)] text-[14px] leading-[1] font-extrabold text-black";

  // controls: /book-now 1.8rem, 47px, radius 4px; /book Roboto 15px, 40px, radius 7px
  const fieldBase = md
    ? "block w-full min-h-[47px] rounded-[4px] border-0 bg-white text-[1.6rem] leading-[1.3em] font-normal text-black md:text-[1.8rem]"
    : "block w-full min-h-[40px] rounded-[7px] border-0 bg-white font-[family-name:var(--font-roboto)] text-[15px] font-medium text-[#3F3F3F]";
  const inputClass = md
    ? `${fieldBase} px-[16px] py-[6px]`
    : `${fieldBase} px-[1rem] py-[0.5rem] leading-[1.4]`;
  const selectClass = md
    ? `${fieldBase} py-[6px] pr-[20px] pl-[16px]`
    : `${fieldBase} py-[5px] pr-[20px] pl-[14px] leading-[1.5rem]`;

  // submit: full width (button_width 100), kit button box, 40px size-sm floor.
  // /book-now 2.4rem rust; /book 15px #6474f3
  const buttonClass = md
    ? "border-rust bg-rust text-white hover:bg-white hover:text-rust text-[2.4rem]"
    : "border-white bg-[#6474f3] text-white text-[15px]";

  if (result === "success" || result === "error") {
    return <SubmitResultPanel comingSoon={comingSoon} state={result} />;
  }

  return (
    <form
      aria-label="New Form"
      className={`flex flex-wrap ${wrapperClass}`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (result === "pending") return;
        setResult("pending");
        setFieldErrors({});
        const data = new FormData(e.currentTarget);
        const outcome = await submitLeadAction("booking", cityKey, data);
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
          {fieldErrors[field.name] && (
            <p className="mt-[0.5rem] text-[1.4rem] text-rust">{fieldErrors[field.name]}</p>
          )}
        </div>
      ))}
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
      <div className={`${groupClass} w-full`}>
        <button
          type="submit"
          disabled={result === "pending"}
          className={`${buttonClass} block min-h-[40px] w-full rounded-[5px] border px-[2.4rem] py-[1.1rem] leading-[1.2em] font-bold uppercase transition-colors${result === "pending" ? " opacity-70" : ""}`}
        >
          {bookSubmitLabel}
        </button>
      </div>
    </form>
  );
}
