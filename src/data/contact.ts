// Verbatim copy from docs/superpowers/reference/ivycleans-live/contact.html
// (raw markup for the form fields, hours/phone <br> line breaks, and the
// meta description) and contact-content-dump.txt (heading/copy order,
// grep-verified against the task brief's line numbers 30-59).

export const contactMeta: { title: string; description: string } = {
  title: "Contact - Ivy Cleans",
  description:
    "Give us a call, we try to answer all enquiries within 24 hours on business days.",
};

export const contactHeader = {
  overline: "GET IN TOUCH WITH OUR TEAM",
  h2a: "Contact Us",
  h2b: "We would love to hear from you!",
  intro:
    "Give us a call, we try to answer all enquiries within 24 hours on business days.",
};

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

// contact.html's #30bda89 Elementor form, field order + attributes verbatim
// (name="form_fields[...]" is the live submission name; the WP hidden fields
// post_id/form_id/referer_title/queried_id are display-irrelevant and are
// intentionally omitted — see ContactFormDisplay.tsx).
export const contactFields: ContactField[] = [
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
];

export const contactSubmitLabel = "Send";

// contact.html's google_maps widget (#8472915): iframe src/title copied
// character-for-character (the live markup HTML-entity-escapes "&" as
// "&#038;" inside the src attribute; that's just HTML escaping of the same
// query-string "&", not a content difference).
export const contactMap = {
  src: "https://maps.google.com/maps?q=ivy%20cleans&t=m&z=16&output=embed&iwloc=near",
  title: "ivy cleans",
};

export const contactInfo = {
  locationHeading: "Location",
  // Verbatim: "Suite 208", not "West Unit" as some footer copy has it
  // elsewhere on the site — do not "fix" this to match the footer.
  address: "5821 Cedar Lake Road Suite 208 Minneapolis, MN 55416",
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
  phone: "612-424-0391",
  email: "Support@ivycleans.com",
};
