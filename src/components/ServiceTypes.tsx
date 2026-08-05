import Image from "next/image";
import { services } from "@/data/services";

export default function ServiceTypes() {
  return (
    /* continues the white "Professional Cleaning Services" band on the live site */
    <section className="bg-white pb-[1rem] md:pb-[2rem] lg:pb-[6rem]">
      {/* the band's single 10px widget-wrap padding is emitted by Intro's half at the
          top; this half only closes it at the bottom */}
      <div className="mx-auto max-w-[1098px] px-[10px] pb-[10px]">
        {/* live wraps the five image-box widgets in one widget-wrap: the flex line gap
            measures 66.5px @1440 (8rem) between rows against 2x2rem of card padding,
            i.e. 4rem of row gap; at <=767 each card is its own line with no gap */}
        <div className="flex flex-wrap justify-center lg:gap-y-[4rem]">
          {/* live c03359c: widget-container padding 2rem (1rem <=1024), image
              margin-bottom 1rem — plus the inline image's descender, which the probe
              measures as a 16.0px @1440 / 19.0px @390 image-to-title gap */}
          {services.map((s) => (
            <article key={s.title} className="w-full p-[1rem] text-center lg:w-1/3 lg:p-[2rem]">
              <Image
                src={s.image}
                alt={s.alt}
                width={s.width}
                height={s.height}
                className="mb-[1.9rem] h-auto w-full"
              />
              <h3 className="mb-[10px] text-[2rem] leading-[1.2em] font-bold uppercase md:text-[2.2rem] lg:text-[2.7rem]">
                {s.title}
              </h3>
              <p className="text-[1.6rem] leading-[1.5em] font-light">{s.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
