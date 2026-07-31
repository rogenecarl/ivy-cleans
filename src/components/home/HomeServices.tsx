import Image from "next/image";
import { serviceIntro, services } from "@/data/services";

export default function HomeServices() {
  return (
    <section className="bg-white pt-[2rem] pb-[1rem] md:pt-[3rem] md:pb-[2rem] lg:pt-[6rem] lg:pb-[6rem]">
      <div className="ec">
        <h2 className="mb-[2rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:text-[4rem] lg:text-[4.5rem]">
          Professional Cleaning Services Minneapolis, MN
        </h2>
        <div className="mb-[2rem] text-[1.6rem] leading-[1.5em] font-light md:text-[1.8rem] lg:text-[1.9rem]">
          {serviceIntro.map((p) => (
            <p key={p.slice(0, 40)} className="mb-[2rem]">
              {p}
            </p>
          ))}
        </div>
        {/* card layout copied from ServiceTypes.tsx */}
        <div className="flex flex-wrap justify-center">
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
