import type { Metadata } from "next";
import { contactMeta } from "@/data/contact";
import ContactHeader from "@/components/contact/ContactHeader";
import ContactFormDisplay from "@/components/contact/ContactFormDisplay";
import ContactMap from "@/components/contact/ContactMap";
import ContactInfo from "@/components/contact/ContactInfo";

export const metadata: Metadata = {
  title: contactMeta.title,
  description: contactMeta.description,
};

/*
 * contact.html's second top-level section (#c5d4ce7, "contact-sec02"):
 * background is a two-stop gradient (#EEF7F4 top 15%, #FFFFFF below),
 * padding steps 0/0/9.6rem/0 (desktop) -> 0/1rem/4rem/1rem (<=1024) ->
 * 0/1rem/3rem/1rem (<=767) per post-34.css. A "Start custom CSS" rule
 * (`.contact-sec02 > .elementor-container{box-shadow:...;border-radius:4px}`)
 * turns its two-column row into one rounded card. The two columns are both
 * elementor-col-50 (side by side at desktop), stacking full width below
 * lg — same lg:flex-row / w-1/2 convention already used for 50/50 rows
 * elsewhere in this repo (BeforeAfter.tsx, Packages.tsx):
 *   left  #2e9a1fb  white bg, 1px #E5E7EB border (no right edge), left
 *         corners rounded; padding 4.8rem (desktop) -> 2rem (<=1024).
 *         Holds the "We would love to hear from you!" lead-in + form.
 *   right #15f9315  #ECF9F9 bg, 1px #E5E7EB border (no left edge), right
 *         corners rounded; padding 2.4rem (desktop) -> 2rem (<=1024).
 *         Holds the map, then the Location/Hours/Location info blocks
 *         (matches the live column's widget order top to bottom).
 */
export default function ContactPage() {
  return (
    <>
      <ContactHeader variant="banner" />
      <section className="bg-[linear-gradient(180deg,#EEF7F4_15%,#FFFFFF_15%)] pb-[3rem] md:pb-[4rem] lg:pb-[9.6rem]">
        <div className="ec">
          <div className="flex flex-col overflow-hidden rounded-[4px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] lg:flex-row">
            <div className="w-full border border-[#E5E7EB] bg-white p-[2rem] lg:w-1/2 lg:border-r-0 lg:p-[4.8rem]">
              <ContactHeader variant="form" />
              <ContactFormDisplay />
            </div>
            <div className="w-full border border-[#E5E7EB] bg-[#ECF9F9] p-[2rem] lg:w-1/2 lg:border-l-0 lg:p-[2.4rem]">
              <ContactMap />
              <ContactInfo />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
