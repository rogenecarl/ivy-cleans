// post-8.css ff4b242: padding 4rem; video widget 6bf3083, 16:9, youtube OBgUjubbP88
export default function VideoEmbed() {
  return (
    <section className="bg-white py-[4rem]">
      <div className="ec">
        <div className="aspect-video w-full">
          <iframe
            src="https://www.youtube.com/embed/OBgUjubbP88?start=1"
            title="Ivy Cleans"
            className="h-full w-full"
            loading="lazy"
            // Standard YouTube iframe embed `allow` list — not reference-derived (the
            // live widget's src/allow attrs are never present in static HTML; see above).
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
