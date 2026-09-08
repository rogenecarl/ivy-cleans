import type { ContactData } from "@/data/contact";

// contact.html column 15f9315: Location 41ed112/0d6e58e, Hours bb6e78a/df404d9, phone/email 2bb8399/7416574 (headed "Location" on live too).
// post-34.css: headings 2.4rem/600 (2.2rem <=1024) with -1rem below, paragraphs 1.6rem with -2rem — mb-[1rem] / mb-[2rem] here.
export default function ContactInfo({
  contactInfo,
}: {
  contactInfo: ContactData["contactInfo"];
}) {
  return (
    <div>
      {/* heading and line together, or neither */}
      {contactInfo.address !== undefined && (
        <>
          <h2 className="text-herogreen mb-[1rem] text-[2.2rem] leading-[1.2em] font-semibold lg:text-[2.4rem]">
            {contactInfo.locationHeading}
          </h2>
          <p className="text-herogreen mb-[2rem] text-[1.6rem] leading-[1.5em]">
            {contactInfo.address}
          </p>
        </>
      )}

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
