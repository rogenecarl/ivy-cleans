import type { ContactData } from "@/data/contact";

// contact.html #8472915: iframe verbatim, post-34.css height 400px
export default function ContactMap({
  contactMap,
}: {
  contactMap: ContactData["contactMap"];
}) {
  // empty src omits the iframe
  if (contactMap.src === "") return null;
  return (
    <iframe
      loading="lazy"
      src={contactMap.src}
      title={contactMap.title}
      aria-label={contactMap.title}
      className="mb-[2rem] h-[400px] w-full border-0"
    />
  );
}
