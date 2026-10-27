// post-8.css 6455f48: the live iframe (widget 1ca6260), full width, 450px tall, ~0.4rem descender below
export default function MapEmbed({ mapSrc }: { mapSrc: string | null }) {
  return (
    <section className="bg-white">
      <div className="ec">
        <div className="pb-[0.4rem]">
          {/* mapSrc is city-sourced (CityContent.maps.home); null omits the
              iframe entirely rather than rendering a broken embed. */}
          {mapSrc !== null && (
            <iframe
              src={mapSrc}
              width={600}
              height={450}
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ivy Cleans location on Google Maps"
              className="block h-[450px] w-full"
            />
          )}
        </div>
      </div>
    </section>
  );
}
