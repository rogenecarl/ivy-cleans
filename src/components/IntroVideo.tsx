/*
 * Intro section (sec03, id 3980875) widget elementor-element-70502ce, immediately
 * below the "Your Happiness is our Priority" heading (widget e32c6fb) in the same
 * column (c114142). data-settings gives youtube_url=https://www.youtube.com/watch
 * ?v=OBgUjubbP88&t=1s, video_type=youtube, controls=yes — identical id/start time to
 * the /home page's lazy video widget (src/components/home/VideoEmbed.tsx), so this
 * mirrors that component's embed exactly. The dumped HTML only has an empty
 * <div class="elementor-video"></div> (Elementor lazy-renders the iframe client-side),
 * but post-2035.css does emit `70502ce .elementor-wrapper{--video-aspect-ratio:1.77777}`
 * i.e. a 16:9 player — so we embed the standard YouTube player in a matching
 * aspect-ratio box rather than inventing a fixed pixel size.
 */
import type { TokenSource } from "@/content/interpolate";
import { t } from "@/content/interpolate";

export default function IntroVideo({ bits }: { bits: TokenSource }) {
  return (
    <div className="aspect-video w-full">
      <iframe
        src="https://www.youtube.com/embed/OBgUjubbP88?start=1"
        title={t("Book Your House Cleaning with Ivy Cleans | {city}’s Top Cleaning Service", bits)}
        className="h-full w-full"
        loading="lazy"
        // Standard YouTube iframe embed `allow` list — not reference-derived (the live
        // widget's src/allow attrs are never present in static HTML; see above).
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
