import type { ContactData } from "@/data/contact";

/*
 * contact.html's google_maps widget (#8472915): iframe copied verbatim
 * (src/title/aria-label all "ivy cleans", loading="lazy" on the live
 * markup). post-34.css sets a fixed height:400px on this widget's iframe
 * (the only rule scoped to #8472915).
 */
export default function ContactMap({
  contactMap,
}: {
  contactMap: ContactData["contactMap"];
}) {
  // contactMap.src is city-sourced (CityContent.maps.contact ?? ""); an
  // empty string omits the iframe entirely rather than rendering a broken
  // embed. Minneapolis's value is always non-empty, so bytes are unchanged.
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
