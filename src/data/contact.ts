// Verbatim copy from docs/superpowers/reference/ivycleans-live/contact.html
// (raw markup for the form fields, hours/phone <br> line breaks, and the
// meta description) and contact-content-dump.txt (heading/copy order,
// grep-verified against the task brief's line numbers 30-59).

import type { CityContent } from '../content/types'

export type ContactField =
  | {
      kind: "text" | "email";
      label: string;
      id: string;
      placeholder: string;
      required: boolean;
    }
  | {
      kind: "select";
      label: string;
      id: string;
      options: string[];
      required: boolean;
    }
  | {
      kind: "textarea";
      label: string;
      id: string;
      placeholder: string;
      rows: number;
      required: boolean;
    };

export type ContactData = {
  contactMeta: { title: string; description: string };
  contactHeader: { overline: string; h2a: string; h2b: string; intro: string };
  contactFields: ContactField[];
  contactSubmitLabel: string;
  contactMap: { src: string; title: string };
  contactInfo: {
    locationHeading: string;
    address: string;
    hoursHeading: string;
    hours: string[];
    location2Heading: string;
    phone: string;
    email: string;
  };
  contactResult: {
    successHeading: string;
    successBody: string;
    errorHeading: string;
    errorBody: string;
  };
};

export function contactData(c: CityContent): ContactData {
  return {
    contactMeta: {
      title: "Contact - Ivy Cleans",
      description:
        "Give us a call, we try to answer all enquiries within 24 hours on business days.",
    },

    contactHeader: {
      overline: "GET IN TOUCH WITH OUR TEAM",
      h2a: "Contact Us",
      h2b: "We would love to hear from you!",
      intro:
        "Give us a call, we try to answer all enquiries within 24 hours on business days.",
    },

    // contact.html's #30bda89 Elementor form, field order + attributes verbatim
    // (name="form_fields[...]" is the live submission name; the WP hidden fields
    // post_id/form_id/referer_title/queried_id are display-irrelevant and are
    // intentionally omitted — see ContactFormDisplay.tsx).
    contactFields: [
      {
        kind: "text",
        label: "Name",
        id: "form-field-name",
        placeholder: "Your Name",
        required: false,
      },
      {
        kind: "email",
        label: "Email",
        id: "form-field-email",
        placeholder: "Email",
        required: true,
      },
      {
        kind: "text",
        label: "Phone Number",
        id: "form-field-field_66433ea",
        placeholder: "(777) 777-7777",
        required: false,
      },
      {
        kind: "select",
        label: "Are You Looking For Help With A Cleaning Project?",
        id: "form-field-message",
        options: ["-", "Yes", "No"],
        required: true,
      },
      {
        kind: "textarea",
        label: "How Can We Help?",
        id: "form-field-field_45db7dd",
        placeholder: "Give us some more details on how we can help.",
        rows: 4,
        required: false,
      },
    ],

    contactSubmitLabel: "Send",

    // contact.html's google_maps widget (#8472915): iframe src/title copied
    // character-for-character (the live markup HTML-entity-escapes "&" as
    // "&#038;" inside the src attribute; that's just HTML escaping of the same
    // query-string "&", not a content difference).
    // FACT-class: city location details come from CityContent (contract: contact
    // page layout/copy frozen, location details swap per city). Sourced from
    // CityContent.maps.contact (one of the three live map embeds — finding 6),
    // not research.mapEmbedUrl.
    contactMap: {
      src: c.maps.contact ?? "",
      title: "ivy cleans",
    },

    contactInfo: {
      locationHeading: "Location",
      // City-sourced: CityContent.contactAddress carries the live "Suite 208"
      // variant (distinct from the footer's "West Unit 208" wording in
      // CityContent.address — do not "fix" one to match the other), falling
      // back to `address` for a city that never recorded the variant.
      address: c.contactAddress ?? c.address,
      hoursHeading: "Hours",
      // contact.html #df404d9: one <p> with two <br /> splitting it into three
      // lines (Mon-Fri / Sat / Sun), each "H:MM AM – H:MM PM" using an en dash
      // (U+2013) with a space on each side, not a hyphen.
      hours: [
        "Mon-Fri: 8:00 AM – 5:00 PM",
        "Sat: 8:00 AM – 5:00 PM",
        "Sun: 8:00 AM – 5:00 PM",
      ],
      // The live page repeats the "Location" heading for this second block
      // (contact.html #2bb8399) even though it holds the phone/email, not an
      // address — reproduced verbatim, not renamed to "Contact".
      location2Heading: "Location",
      // contact.html #7416574: one <p> with a single <br /> splitting phone
      // (line 1) from email (line 2).
      // FACT-class: city location details come from CityContent (contract: contact
      // page layout/copy frozen, location details swap per city).
      phone: c.phone,
      email: "Support@ivycleans.com",
    },

    // OUR copy (user-approved) for the post-submit state — mirrors book.ts's
    // comingSoon precedent, adapted to this form's shape (no phone/email
    // fallback line; see ContactFormDisplay.tsx). Apostrophes are literal
    // U+2019: these strings render as JSX expressions, so an `&rsquo;`
    // entity would print literally instead of being decoded.
    contactResult: {
      successHeading: "Thanks, we’ve got your message.",
      successBody: "We try to answer all enquiries within 24 hours on business days.",
      errorHeading: "Something went wrong.",
      errorBody: "Please call us instead and we’ll get straight to it.",
    },
  };
}
