/*
 * Section ff4b242 (post-8.css) sits right after the hero and before the
 * "Professional Cleaning Services..." section (HomeServices) in home.html.
 * post-8.css: `.elementor-element-ff4b242{padding:4rem 0rem 4rem 0rem}` with no
 * responsive override — live measures 40/40 at 1920/1024/768/390, 32/32 at
 * 1280 and 33.28/33.28 at 1440, i.e. the flat 4rem riding the root ladder.
 *
 * It holds a single elementor-widget-video (id 6bf3083) whose data-settings
 * gives youtube_url=https://www.youtube.com/watch?v=OBgUjubbP88&t=1s,
 * video_type=youtube, controls=yes. Elementor lazy-renders that widget's
 * iframe client-side (the dumped HTML only has an empty
 * <div class="elementor-video"></div>), but post-8.css does emit
 * --video-aspect-ratio:1.77777 for #6bf3083's wrapper, i.e. a 16:9 player —
 * live probes confirm it: 970.08x545.66 @1440, 1004x564.75 @1024 and
 * 370x208.13 @390 are all exactly 16:9.
 */
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
