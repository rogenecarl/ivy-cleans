import { contactFields, contactSubmitLabel } from "@/data/contact";

/*
 * Display-only reproduction of contact.html's #30bda89 Elementor form
 * (elementor-widget-form, "New Form"). Deliberate deviation from live: the
 * live markup is `<form class="elementor-form" method="post" name="New Form"
 * aria-label="New Form">` — this clone drops `method`/`name` (there's
 * nowhere for a POST to go) and keeps only `aria-label="New Form"`, per the
 * task brief. The four WP-plumbing hidden fields
 * (post_id/form_id/referer_title/queried_id) are display-irrelevant and are
 * intentionally omitted rather than faked.
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
 * post-34.css (#30bda89): labels 1.6rem/#37745F; fields 1.6rem/#000 on
 * white, #D1D5DB border, 5px radius; submit button 1.8rem, #BF360C
 * (rust) fill, white text. Field padding isn't in post-34.css (Elementor's
 * base widget CSS, not captured) — approximated for this first pass.
 */
const HALF_WIDTH_IDS = new Set(["form-field-name", "form-field-email"]);

const FIELD_CLASS =
  "w-full rounded-[5px] border border-[#D1D5DB] bg-white px-[1.5rem] py-[1rem] text-[1.6rem] leading-[1.5] text-black";

export default function ContactFormDisplay() {
  return (
    <form aria-label="New Form" className="flex flex-col gap-[1rem]">
      <div className="flex flex-wrap gap-[1rem]">
        {contactFields.map((field) => (
          <div
            key={field.id}
            className={
              HALF_WIDTH_IDS.has(field.id)
                ? "w-full sm:flex-1"
                : "w-full"
            }
          >
            <label
              htmlFor={field.id}
              className="text-herogreen mb-[0.5rem] block text-[1.6rem]"
            >
              {field.label}
            </label>
            {field.kind === "select" ? (
              <select
                id={field.id}
                name={`form_fields[${field.id.replace("form-field-", "")}]`}
                required={field.required}
                className={FIELD_CLASS}
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
                name={`form_fields[${field.id.replace("form-field-", "")}]`}
                placeholder={field.placeholder}
                rows={field.rows}
                required={field.required}
                className={FIELD_CLASS}
              />
            ) : (
              <input
                id={field.id}
                name={`form_fields[${field.id.replace("form-field-", "")}]`}
                type={field.kind}
                placeholder={field.placeholder}
                required={field.required}
                className={FIELD_CLASS}
              />
            )}
          </div>
        ))}
      </div>
      <button
        type="submit"
        className="mt-[0.5rem] self-end rounded-[3px] bg-[#BF360C] px-[2.4rem] py-[1.2rem] text-[1.8rem] font-semibold text-white"
      >
        {contactSubmitLabel}
      </button>
    </form>
  );
}
