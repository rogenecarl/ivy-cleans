/*
 * Section ff4b242 (post-8.css) sits right after the hero and before the
 * "Professional Cleaning Services..." section (HomeServices) in home.html.
 * It holds a single elementor-widget-video (id 6bf3083) whose data-settings
 * gives youtube_url=https://www.youtube.com/watch?v=OBgUjubbP88&t=1s,
 * video_type=youtube, controls=yes. Elementor lazy-renders that widget's
 * iframe client-side (the dumped HTML only has an empty
 * <div class="elementor-video"></div>), but post-8.css does emit
 * --video-aspect-ratio:1.77777 for #6bf3083's wrapper, i.e. a 16:9 player —
 * so we embed the standard YouTube player for that id/start time inside a
 * matching aspect-ratio box rather than inventing a fixed pixel size.
 */
export default function VideoEmbed() {
  return (
    <section className="bg-white">
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
