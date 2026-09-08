import Image from "next/image";
import type { Service } from "@/data/services";

export default function ServiceTypes({ services }: { services: Service[] }) {
  return (
    /* continues the white "Professional Cleaning Services" band on the live site */
    <section className="bg-white pb-[1rem] md:pb-[3rem] lg:pb-[6rem]">
      {/* the band's single 10px widget-wrap padding is emitted by Intro's half at the
          top; this half only closes it at the bottom */}
      <div className="mx-auto max-w-[132rem] px-[10px] pb-[10px]">
        {/* one widget-wrap: 4rem row gap from 768, none below */}
        <div className="flex flex-wrap justify-center lg:gap-y-[4rem]">
          {/* c03359c: padding 2rem (1rem <=1024), image margin-bottom 1rem */}
          {services.map((s) => (
            <article key={s.title} className="w-full p-[1rem] text-center md:w-1/3 lg:p-[2rem]">
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
