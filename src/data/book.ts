// Verbatim from docs/superpowers/reference/ivycleans-live/book-now.html and
// book.html (+ book-now-content-dump.txt / book-content-dump.txt for
// heading/copy order). Both pages carry the IDENTICAL 10-field Elementor
// form (same ids/names/labels/options/placeholders/required) — the only
// difference in the reference markup is the Elementor size class
// (elementor-size-md on /book-now, elementor-size-sm on /book), which
// BookingForm's `size` prop switches. Two details were grep-verified against
// both HTML files before transcription:
//   (a) the "Message" placeholder in the content dump belongs to field 6,
//       the ADDRESS field (id="form-field-field_1872bc3") — both
//       book-now.html:443 and book.html:412 read:
//       `<input ... id="form-field-field_1872bc3" ... placeholder="Message"
//       value=" " required="required">`. This is a live authoring quirk
//       (the address field's placeholder literally says "Message"), not a
//       transcription error, and is preserved verbatim.
//   (b) field 5 ("How Soon Are You Looking To Have This Cleaned?") does open
//       on a blank/space option: both files read
//       `<option value=" " selected="selected"> </option>` before the ASAP
//       option (book-now.html:431, book.html:400) — a single space for both
//       value and the option's text content.

import type { CityContent } from "../content/types";
import { t } from "../content/interpolate";

export type BookField =
  | {
      kind: "select";
      label: string;
      id: string;
      name: string;
      required: boolean;
      options: { value: string; label: string }[];
    }
  | {
      kind: "number" | "text" | "email" | "tel";
      label: string;
      id: string;
      name: string;
      required: boolean;
      placeholder: string;
    };

export type BookData = {
  bookNowMeta: { title: string };
  bookMeta: { title: string; description: string };
  bookHeader: { overline: string; h2: string };
  bookLeadIn: {
    heading: string;
    intro: string;
    callPrompt: string;
    hours: string;
    phone: string;
    phoneHref: string;
  };
  bookCallNow: { label: string; href: string };
  bookFields: BookField[];
  bookSubmitLabel: string;
  comingSoon: {
    heading: string;
    body: string;
    phone: string;
    phoneHref: string;
    email: string;
    emailHref: string;
  };
};

export function bookData(c: CityContent): BookData {
  return {
    bookNowMeta: {
      title: "Book Now - Ivy Cleans",
    },

    // live /book-now has NO meta description — omit the field (confirmed: no
    // <meta name="description"> tag in book-now.html's <head>, unlike book.html).
    bookMeta: {
      title: "Book - Ivy Cleans",
      description: "A Couple of Questions For Your FREE Quote!",
    },

    // /book only (book-content-dump.txt: <h3>REQUEST OUR SERVICES / <h2>Book
    // Now); /book-now renders the form with no page heading above it.
    bookHeader: {
      overline: "REQUEST OUR SERVICES",
      h2: "Book Now",
    },

    /*
     * /book only — the lead-in block the live page renders between the "Book Now"
     * H2 and the form. Verbatim from book.html:
     *   :319  <p class="elementor-heading-title ...">A Couple of Questions For
     *         Your FREE Quote! </p>              (widget #6d970af1)
     *   :323  <p>You&#8217;re just 3 steps away from a clean house!</p>
     *         <p><strong>Prefer To Call? Sure! </strong></p>
     *         <p><strong>We&#8217;re Available Monday-Friday 7 am-7 pm</strong></p>
     *         <p><a href="tel:6124240391"><strong>(612) 424-0391</strong></a></p>
     *                                            (widget #30422d1e)
     * Cross-checked against book-content-dump.txt:32-37, whose (trimmed) lines are
     * byte-identical. Elementor's trailing markup spaces ("Quote! ", "Sure! ") are
     * dropped for the same reason bookSubmitLabel drops "Claim "'s — they are
     * whitespace inside the tag, not part of the label, and HTML collapses them.
     * /book-now has NO equivalent block: book-now.html:365 goes straight from
     * section #925b984 to the form widget #a295442 (verified by grepping the whole
     * `data-elementor-id="2336"` subtree — one section, one column, one widget).
     * phone/phoneHref are FACT-class (CityContent.phoneDisplay/phoneHref).
     */
    bookLeadIn: {
      heading: "A Couple of Questions For Your FREE Quote!",
      intro: "You’re just 3 steps away from a clean house!",
      callPrompt: "Prefer To Call? Sure!",
      hours: "We’re Available Monday-Friday 7 am-7 pm",
      phone: c.phoneDisplay,
      phoneHref: c.phoneHref,
    },

    /*
     * /book only — button widget #5dafbb39 (book.html:325-333). Its widget classes
     * are `elementor-align-center elementor-hidden-desktop elementor-hidden-tablet`
     * and the button is `elementor-button-link elementor-size-sm` with a
     * `fas fa-phone` icon. See BookSection for why "hidden desktop + tablet" is
     * NOT the same as "mobile only" on this kit.
     */
    bookCallNow: {
      label: "Call Now",
      href: c.phoneHref,
    },

    // The 10 fields in live order, verbatim from book-now.html /
    // book.html (identical on both pages apart from the elementor-size-md /
    // elementor-size-sm class, which lives in BookingForm, not here).
    bookFields: [
      {
        kind: "select",
        label: "What Type of Service Are Your Looking For?",
        id: "form-field-email",
        name: "form_fields[email]",
        required: true,
        options: [
          {
            value: "Standard Cleaning",
            label: "Standard Cleaning (Basic Cleaning Package)",
          },
          {
            value: "Recurring Cleaning",
            label: "Recurring Cleaning ( Standard + Additional Discounts)",
          },
          {
            value: "Deep Cleaning",
            label: "Deep Cleaning ( Most Popular Option)",
          },
          {
            value: "Moving Cleaning",
            label:
              "Move-In/Move-Out Cleaning (Most Comprehensive, Total Clean)",
          },
        ],
      },
      {
        kind: "select",
        label: "How Would Your Describe Your Home Right Now?",
        id: "form-field-field_22aa910",
        name: "form_fields[field_22aa910]",
        required: true,
        options: [
          {
            value: "Slightly Dirty",
            label: "Slightly Dirty (Nothing crazy)",
          },
          {
            value: "Pretty Dirty",
            label:
              "Pretty Dirty (It’s been awhile since we cleaned, it’s pretty dirty)",
          },
          {
            value: "Very Diry",
            label: "Very Dirty (It’s a nightmare, please save me)",
          },
        ],
      },
      {
        kind: "number",
        label: "How Many Bedrooms?",
        id: "form-field-field_c4cfac1",
        name: "form_fields[field_c4cfac1]",
        required: true,
        placeholder: "ex. 3",
      },
      {
        kind: "number",
        label: "How Many Bathrooms?",
        id: "form-field-field_caacb3a",
        name: "form_fields[field_caacb3a]",
        required: true,
        placeholder: "ex. 2",
      },
      {
        kind: "select",
        label: "How Soon Are You Looking To Have This Cleaned?",
        id: "form-field-message",
        name: "form_fields[message]",
        required: true,
        options: [
          { value: " ", label: " " },
          { value: "ASAP (It’s an emergency)", label: "ASAP (It’s an emergency)" },
          { value: "Sometime this week", label: "Sometime this week" },
          { value: "Sometime next week", label: "Sometime next week" },
          { value: "No Rush", label: "No Rush" },
          {
            value: "Not Sure (Just price shopping right now)",
            label: "Not Sure (Just price shopping right now)",
          },
        ],
      },
      {
        kind: "text",
        label: "What’s the Address of the Property?",
        id: "form-field-field_1872bc3",
        name: "form_fields[field_1872bc3]",
        required: true,
        placeholder: "Message",
      },
      {
        kind: "text",
        label: "Full Name",
        id: "form-field-name",
        name: "form_fields[name]",
        required: true,
        placeholder: "Full Name",
      },
      {
        kind: "email",
        label: "Email Address",
        id: "form-field-field_ca2243e",
        name: "form_fields[field_ca2243e]",
        required: true,
        placeholder: "example@gmail.com",
      },
      {
        kind: "tel",
        label: "Phone Number",
        id: "form-field-field_deeaf01",
        name: "form_fields[field_deeaf01]",
        required: true,
        placeholder: "777-777-7777",
      },
      {
        kind: "select",
        label: "How Would You Prefer To Be Contacted?",
        id: "form-field-field_1abcd81",
        name: "form_fields[field_1abcd81]",
        required: true,
        options: [
          { value: "Call Me", label: "Call Me" },
          { value: "Text Me", label: "Text Me" },
          { value: "Email Me", label: "Email Me" },
          { value: "It’s all the same to me", label: "It’s all the same to me" },
        ],
      },
    ],

    // Verbatim button text on BOTH pages (book-now.html / book.html:
    // `<span class="elementor-button-text">Claim </span>` — the trailing space
    // inside the span is Elementor markup whitespace, not part of the label).
    bookSubmitLabel: "Claim",

    // OUR copy (user-approved) for the post-submit state — there is no live
    // equivalent since both forms' real submission target is unreachable from
    // this static clone. The phone number embedded in `body` is FACT-class
    // (CityContent.phone) tokenized through t(), same format as `phone` below.
    comingSoon: {
      heading: "Online booking is coming soon!",
      body: t(
        "In the meantime, call us at {phone} or email Support@ivycleans.com.",
        c,
      ),
      phone: c.phone,
      phoneHref: c.phoneHref,
      email: "Support@ivycleans.com",
      emailHref: "mailto:Support@ivycleans.com",
    },
  };
}
