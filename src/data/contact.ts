// Verbatim from contact.html and contact-content-dump.txt.

import type { CityContent } from '../content/types'
import { realAddress } from '../content/interpolate'
import { mapSrc } from "./maps";

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
    /** Absent when the city has no real address — render nothing. */
    address?: string;
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

    // contact.html form 30bda89, fields verbatim; WP hidden fields omitted
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

    // contact.html map widget 8472915; src from CityContent.maps.contact
    contactMap: {
      src: mapSrc(c, "contact") ?? "",
      title: "ivy cleans",
    },

    contactInfo: {
      locationHeading: "Location",
      // contactAddress is the live "Suite 208" variant, distinct from the footer's — keep both
      // undefined without a real address: render nothing, never the placeholder
      address: realAddress(c.contactAddress ?? c.address),
      hoursHeading: "Hours",
      // contact.html df404d9: three lines split by <br />, en dashes
      hours: [
        "Mon-Fri: 8:00 AM – 5:00 PM",
        "Sat: 8:00 AM – 5:00 PM",
        "Sun: 8:00 AM – 5:00 PM",
      ],
      // live repeats the "Location" heading over phone/email; kept
      location2Heading: "Location",
      // contact.html 7416574: phone / email split by <br />
      phone: c.phone,
      email: "Support@ivycleans.com",
    },

    // our copy for the post-submit state; literal U+2019 since these render as JSX expressions
    contactResult: {
      successHeading: "Thanks, we’ve got your message.",
      successBody: "We try to answer all enquiries within 24 hours on business days.",
      errorHeading: "Something went wrong.",
      errorBody: "Please call us instead and we’ll get straight to it.",
    },
  };
}
