import type { ContactData } from "@/data/contact";

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
 * (1.6rem, color #37745F). The paragraph's -2rem cancels the inner <p>'s own
 * 2rem bottom margin rather than the widget gap, so the live DOM probe at
 * 1440 measures heading -> paragraph = 8.3px (1rem) and paragraph -> next
 * heading = 16.6px (2rem); the last paragraph is the column's last widget and
 * gets no trailing gap (its bottom lands exactly on the column's 2.4rem
 * padding, y=951.9). Reproduced here as mb-[1rem] on the headings and
 * mb-[2rem] on every paragraph but the last.
 */
export default function ContactInfo({
  contactInfo,
}: {
  contactInfo: ContactData["contactInfo"];
}) {
  return (
    <div>
      <h2 className="text-herogreen mb-[1rem] text-[2.2rem] leading-[1.2em] font-semibold lg:text-[2.4rem]">
        {contactInfo.locationHeading}
      </h2>
      <p className="text-herogreen mb-[2rem] text-[1.6rem] leading-[1.5em]">
        {contactInfo.address}
      </p>

      <h2 className="text-herogreen mt-0 mb-[1rem] text-[2.2rem] leading-[1.2em] font-semibold lg:text-[2.4rem]">
        {contactInfo.hoursHeading}
      </h2>
      <p className="text-herogreen mb-[2rem] text-[1.6rem] leading-[1.5em]">
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
      <p className="text-herogreen mb-0 text-[1.6rem] leading-[1.5em]">
        {contactInfo.phone}
        <br />
        {contactInfo.email}
      </p>
    </div>
  );
}
