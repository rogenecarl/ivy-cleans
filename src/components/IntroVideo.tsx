// sec03 widget 70502ce: same YouTube id as /home's VideoEmbed, 16:9
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
