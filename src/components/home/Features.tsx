import Image from "next/image";
import { features, featuresOutro } from "@/data/home";

export default function Features() {
  return (
    <section className="bg-white py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec">
        <div className="flex flex-wrap">
          {features.map((f) => (
            <article key={f.title} className="w-full p-[1rem] text-center md:w-1/2 lg:w-1/5 lg:p-[2rem]">
              <Image
                src={f.icon}
                alt=""
                width={f.width}
                height={f.height}
                className="mx-auto mb-[2rem] h-auto w-[8.6rem]"
              />
              <h3 className="mb-[10px] text-[2rem] leading-[1.2em] font-bold">{f.title}</h3>
              <p className="text-[1.4rem] leading-[1.5em] font-light">{f.text}</p>
            </article>
          ))}
        </div>
        <p className="mt-[2rem] text-[1.6rem] leading-[1.5em] font-light md:text-[1.8rem] lg:text-[1.9rem]">
          {featuresOutro}
        </p>
      </div>
    </section>
  );
}
