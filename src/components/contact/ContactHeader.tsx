import type { ContactData } from "@/data/contact";

// contact.html: "banner" = section e3d54f1 (eyebrow cf79f67, h2 3567bdd); "form" = column 2e9a1fb lead-in (h2 918eedb, p 0940d0f).
// post-34.css margins folded into mb-[1.5rem] / mb-[2rem].
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
