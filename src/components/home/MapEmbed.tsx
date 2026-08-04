/*
 * Section 6455f48 (post-8.css, no CSS override) sits between the "Locations"
 * heading section (3699c47) and the location-list paragraphs section
 * (621b7186) — so this renders inside Locations.tsx, not as its own
 * top-level /home section. Its only content is an elementor-widget-html
 * widget (1ca6260) with this exact live <iframe>:
 *   src="https://www.google.com/maps/embed?pb=...!2sIvy%20Cleans!..."
 *   width="600" height="450" allowfullscreen loading="lazy"
 *   referrerpolicy="no-referrer-when-downgrade"
 * No responsive wrapper exists on the live page either (no CSS for
 * 6455f48/1ca6260), so we reproduce the fixed 600x450 size verbatim, only
 * adding overflow-x-auto so a narrow viewport scrolls the iframe instead of
 * blowing out the page.
 */
export default function MapEmbed() {
  return (
    <section className="bg-white">
      <div className="ec overflow-x-auto">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d11291.840137965126!2d-93.3546582!3d44.9648053!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xa37096c9a1657e4f%3A0x5ad9dc450f082983!2sIvy%20Cleans!5e0!3m2!1sen!2sus!4v1690993615991!5m2!1sen!2sus"
          width={600}
          height={450}
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Ivy Cleans location on Google Maps"
          className="mx-auto"
        />
      </div>
    </section>
  );
}
