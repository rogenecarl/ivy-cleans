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
 * turns its two-column row into one rounded card. Unlike the banner above it,
 * this section's container is NOT `.ec`: live DOM probe at 1440 puts the card
 * at x=225/w=990.1 while the banner heading sits at x=235/w=970.1 — i.e. the
 * card spans the full 119rem container and the 10px `.ec` gutter that `.ec`
 * models (Elementor's widget-wrap padding) lives *inside* each column here,
 * folded into their 4.8rem/2.4rem paddings. So the row uses a bare
 * `mx-auto max-w-[119rem]` and the section itself carries the 1rem horizontal
 * padding post-34.css gives it at <=1024 (probe at 390: section padding-left/
 * right = 10px, card x=10/w=370).
 * The two columns are both
 * elementor-col-50 and stack only under Elementor's *mobile* breakpoint, not
 * its tablet one: a live probe at 800x900 still measures them side by side
 * (left x=10/w=390, right x=400/w=390), so this row uses md: (>=768), unlike
 * the lg: 50/50 rows elsewhere in this repo (BeforeAfter.tsx, Packages.tsx),
 * whose live sources really do stack at 1024. Their paddings still step at
 * 1024 (lg:), which is the separate `@media(max-width:1024px)` rule:
 *   left  #2e9a1fb  white bg, border-width 1px 0 1px 1px #E5E7EB (no right
 *         edge — at *every* width, so `border-y border-l`, not a lg-only
 *         override), left corners rounded; padding 4.8rem (desktop) -> 2rem
 *         (<=1024). Holds the "We would love to hear from you!" lead-in +
 *         form.
 *   right #15f9315  #ECF9F9 bg, border-width 1px 1px 1px 0 (no left edge),
 *         right corners rounded; padding 2.4rem (desktop) -> 2rem (<=1024).
 *         Holds the map, then the Location/Hours/Location info blocks
 *         (matches the live column's widget order top to bottom).
 */
export default function ContactPage() {
  return (
    <>
      <ContactHeader variant="banner" />
      <section className="bg-[linear-gradient(180deg,#EEF7F4_15%,#FFFFFF_15%)] px-[1rem] pb-[3rem] md:pb-[4rem] lg:px-0 lg:pb-[9.6rem]">
        <div className="mx-auto max-w-[119rem]">
          <div className="flex flex-col overflow-hidden rounded-[4px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] md:flex-row">
            <div className="w-full border-y border-l border-[#E5E7EB] bg-white p-[2rem] md:w-1/2 lg:p-[4.8rem]">
              <ContactHeader variant="form" />
              <ContactFormDisplay />
            </div>
            <div className="w-full border-y border-r border-[#E5E7EB] bg-[#ECF9F9] p-[2rem] md:w-1/2 lg:p-[2.4rem]">
              <ContactMap />
              <ContactInfo />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
