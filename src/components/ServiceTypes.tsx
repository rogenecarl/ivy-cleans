import Image from "next/image";
import { services } from "@/data/services";

export default function ServiceTypes() {
  return (
    <section className="bg-peach pb-16">
      <div className="mx-auto grid max-w-[1140px] gap-8 px-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <article key={s.title} className="bg-white p-6 shadow-sm">
            <Image src={s.image} alt={s.alt} width={s.width} height={s.height} className="h-auto w-full" />
            <h3 className="mt-4 text-[1.8rem] md:text-[2.2rem]">{s.title}</h3>
            <p className="mt-2 leading-relaxed">{s.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
