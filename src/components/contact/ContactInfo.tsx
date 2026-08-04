import { contactInfo } from "@/data/contact";

/*
 * contact.html's three text-editor blocks stacked below the map in the
 * second section's right column (#15f9315): Location/address
 * (#41ed112/#0d6e58e), Hours/hours (#bb6e78a/#df404d9), and a second
 * "Location" heading that actually holds phone/email (#2bb8399/#7416574 —
 * reproduced verbatim, not relabeled). Both address and phone/email
 * paragraphs carry the live `no-br` class, whose only post-34.css rule
 * (`.no-br br{display:block!important}`) just keeps the <br> line breaks
 * rendering normally — reproduced here as literal <br /> between lines.
 *
 * post-34.css: each heading's widget-container margin is 0 0 -1rem 0
 * (2.4rem/600 desktop -> 2.2rem <=1024, no further 767 step, color
 * #37745F); each paragraph's widget-container margin is 0 0 -2rem 0
 * (1.6rem, color #37745F). Folded against Elementor's 2rem widget gap:
 * heading -> paragraph nets to 1rem, paragraph -> next heading nets to 0
 * (matching the tight heading/copy pairs used across the page).
 */
export default function ContactInfo() {
  return (
    <div>
      <h2 className="text-herogreen mb-[1rem] text-[2.2rem] leading-[1.2em] font-semibold lg:text-[2.4rem]">
        {contactInfo.locationHeading}
      </h2>
      <p className="mb-0 text-[1.6rem] leading-[1.5em] text-[#37745F]">
        {contactInfo.address}
      </p>

      <h2 className="text-herogreen mt-0 mb-[1rem] text-[2.2rem] leading-[1.2em] font-semibold lg:text-[2.4rem]">
        {contactInfo.hoursHeading}
      </h2>
      <p className="mb-0 text-[1.6rem] leading-[1.5em] text-[#37745F]">
        {contactInfo.hours.map((line, i) => (
          <span key={line}>
            {i > 0 && <br />}
            {line}
          </span>
        ))}
      </p>

      <h2 className="text-herogreen mt-0 mb-[1rem] text-[2.2rem] leading-[1.2em] font-semibold lg:text-[2.4rem]">
        {contactInfo.location2Heading}
      </h2>
      <p className="mb-0 text-[1.6rem] leading-[1.5em] text-[#37745F]">
        {contactInfo.phone}
        <br />
        {contactInfo.email}
      </p>
    </div>
  );
}
