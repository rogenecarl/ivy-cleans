"use client";

import { useState } from "react";
import type { BookData } from "@/site/data/book";
import SubmitResultPanel from "./ComingSoonPanel";
import { submitLeadAction } from "@/app/(sites)/[city]/actions";

// The 10-field form on /book-now (a295442), two fields a row from md up, in live order.
// No method/action: submit is intercepted client-side. Live is a 3-step wizard; this is flat.
const SELECT_ARROW: React.CSSProperties = {
  appearance: "none",
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 11 7'%3E%3Cpath fill='%23000' d='M0 0h11L5.5 7z'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  backgroundSize: "11px 7px",
};

export default function BookingForm({
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
  const [result, setResult] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // items-end: a two-line label beside a one-line label still lines the two boxes up
  const wrapperClass = "-mx-[0.75rem] -mb-[2.4rem] items-end";
  const groupClass = "px-[0.75rem] mb-[2.4rem]";
  const labelClass = "block pb-[10px] text-[1.6rem] leading-[1.2em] font-semibold text-white";
  const fieldBase =
    "block w-full min-h-[47px] rounded-[4px] border-0 bg-white text-[1.6rem] leading-[1.3em] font-normal text-black";
  const inputClass = `${fieldBase} px-[16px] py-[6px]`;
  // a long option label ends in an ellipsis before the arrow instead of running under it
  const selectClass = `${fieldBase} truncate py-[6px] pr-[30px] pl-[16px]`;
  const buttonClass = "border-rust bg-rust text-white hover:bg-white hover:text-rust text-[2.4rem]";

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
          className={`${groupClass} w-full md:w-1/2`}
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
              {...field.limits}
              {...(field.kind === "number" ? { step: 1, inputMode: "numeric" as const } : {})}
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
      <div className={`${groupClass} mt-[0.8rem] w-full`}>
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
