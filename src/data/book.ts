// Verbatim from book-now.html / book.html. Same 10-field form on both; only the size class differs (BookingForm).
// Live quirks kept: the address field's placeholder is "Message", and field 5 opens on a blank option.

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
    successHeading: string;
    successBody: string;
    errorHeading: string;
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

    // /book only: lead-in block between the H2 and the form (book.html:319-323, widgets 6d970af1 / 30422d1e)
    bookLeadIn: {
      heading: "A Couple of Questions For Your FREE Quote!",
      intro: "You’re just 3 steps away from a clean house!",
      callPrompt: "Prefer To Call? Sure!",
      hours: "We’re Available Monday-Friday 7 am-7 pm",
      phone: c.phoneDisplay,
      phoneHref: c.phoneHref,
    },

    // /book only: button widget 5dafbb39 — see BookSection for its visibility
    bookCallNow: {
      label: "Call Now",
      href: c.phoneHref,
    },

    // the 10 fields in live order
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

    // live: `<span class="elementor-button-text">Claim </span>`, trailing space dropped
    bookSubmitLabel: "Claim",

    // our copy for the post-submit state
    comingSoon: {
      // heading/body are not rendered on any path today; kept as approved copy
      heading: "Online booking is coming soon!",
      body: t(
        "In the meantime, call us at {phone} or email Support@ivycleans.com.",
        c,
      ),
      phone: c.phone,
      phoneHref: c.phoneHref,
      email: "Support@ivycleans.com",
      emailHref: "mailto:Support@ivycleans.com",
      successHeading: "Thanks, we’ve got your request.",
      successBody: "Someone from our team will be in touch shortly.",
      // the failure heading, same words as contact.ts
      errorHeading: "Something went wrong.",
    },
  };
}
