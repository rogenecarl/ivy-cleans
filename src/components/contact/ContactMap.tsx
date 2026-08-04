import { contactMap } from "@/data/contact";

/*
 * contact.html's google_maps widget (#8472915): iframe copied verbatim
 * (src/title/aria-label all "ivy cleans", loading="lazy" on the live
 * markup). post-34.css sets a fixed height:400px on this widget's iframe
 * (the only rule scoped to #8472915).
 */
export default function ContactMap() {
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
