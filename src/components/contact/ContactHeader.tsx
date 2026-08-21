import type { ContactData } from "@/data/contact";

/*
 * contact.html splits contactHeader's four fields across two different
 * spots in the DOM, even though the data brief bundles them as one object:
 *   - "banner" variant: the page's first top-level section (#e3d54f1, #EEF7F4
 *     band). Holds the eyebrow #cf79f67 ("GET IN TOUCH WITH OUR TEAM",
 *     1.6rem/600 uppercase #BF360C/rust, widget-container margin 0 0 -0.5rem
 *     0) and h2 #3567bdd ("Contact Us", 3.6rem/600 desktop -> 2.8rem <=1024
 *     -> 2.5rem <=767, color #37745F/herogreen). Net gap eyebrow->h2 is
 *     Elementor's 2rem widget spacing minus the eyebrow's -0.5rem margin =
 *     1.5rem (same fold as /blog's BLOGS/H2 pair).
 *   - "form" variant: the lead-in copy that sits directly above the form,
 *     inside the second section's left column (#2e9a1fb) — h2 #918eedb
 *     ("We would love to hear from you!", 2.4rem/600 desktop -> 2.2rem
 *     <=1024, no further 767 override, color #37745F) and paragraph
 *     #0940d0f (1.6rem, color #37745F). Its widget-container margin
 *     0 0 -2rem 0 cancels the *inner* <p>'s own 2rem bottom margin, not the
 *     widget gap: the live DOM probe measures the rendered copy block ending
 *     at y=385.9 and the form starting at y=402.6 at 1440 — a 2rem (16.64px)
 *     gap — so this clone spends that gap as `mb-[2rem]` on the paragraph
 *     itself. No widget-container override on #918eedb itself, so the
 *     default 2rem gap stands between it and the paragraph.
 * Both variants live in this one component (per the task brief's data
 * shape) and are placed by the page where post-34.css puts them.
 */
export default function ContactHeader({
  variant,
  contactHeader,
}: {
  variant: "banner" | "form";
  contactHeader: ContactData["contactHeader"];
}) {
  if (variant === "banner") {
    return (
      <section className="bg-[#EEF7F4] pt-[2rem] pb-[1rem] md:pt-[3rem] md:pb-[2rem] lg:pt-[8.6rem] lg:pb-[3.8rem]">
        <div className="ec">
          <h3 className="text-rust mt-0 mb-[1.5rem] text-[1.6rem] leading-[1.2em] font-semibold uppercase">
            {contactHeader.overline}
          </h3>
          <h2 className="text-herogreen text-[2.5rem] leading-[1.2em] font-semibold md:text-[2.8rem] lg:text-[3.6rem]">
            {contactHeader.h2a}
          </h2>
        </div>
      </section>
    );
  }

  return (
    <>
      <h2 className="text-herogreen mb-[2rem] text-[2.2rem] leading-[1.2em] font-semibold lg:text-[2.4rem]">
        {contactHeader.h2b}
      </h2>
      <p className="text-herogreen mb-[2rem] text-[1.6rem] leading-[1.5em]">
        {contactHeader.intro}
      </p>
    </>
  );
}
