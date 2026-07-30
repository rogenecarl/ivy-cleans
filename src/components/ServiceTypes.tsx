import Image from "next/image";
import { services } from "@/data/services";

export default function ServiceTypes() {
  return (
    /* continues the white "Professional Cleaning Services" band on the live site */
    <section className="bg-white pb-[1rem] md:pb-[2rem] lg:pb-[6rem]">
      <div className="ec">
        <div className="flex flex-wrap justify-center">
          {/* live: widget-container padding 2rem all round, image margin-bottom 1rem */}
          {services.map((s) => (
            <article key={s.title} className="w-full p-[1rem] text-center lg:w-1/3 lg:p-[2rem]">
              <Image
                src={s.image}
                alt={s.alt}
                width={s.width}
                height={s.height}
                className="mb-[1rem] h-auto w-full"
              />
              <h3 className="mt-[0.5rem] mb-[10px] text-[2rem] leading-[1.2em] font-bold uppercase md:text-[2.2rem] lg:text-[2.7rem]">
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
