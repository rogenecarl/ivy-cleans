import Image from "next/image";
import { site } from "@/data/site";
import { heroParagraphs } from "@/data/services";
import CtaButton from "./CtaButton";

export default function Hero() {
  return (
    <section className="bg-peach bg-cover bg-center" style={{ backgroundImage: "url(/images/sec01-bgg.jpg)" }}>
      <div className="mx-auto grid max-w-[1140px] gap-8 px-4 py-16 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h1 className="text-herogreen text-[3rem] leading-[1em] font-bold md:text-[4rem] lg:text-[7.2rem]">
            Cleaning Services Minneapolis
          </h1>
          <div className="mt-8 space-y-4 text-[1.05rem] leading-relaxed">
            {heroParagraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
          <div className="mt-8">
            <CtaButton size="lg" />
            <p className="mt-4 text-[1.4rem] font-semibold">Prefer to call? We&rsquo;re available now.</p>
            <p className="text-rust text-[1.8rem] font-bold">
              <a href={site.phoneHref}>{site.phone}</a>
            </p>
          </div>
        </div>
        <div className="relative hidden lg:block">
          <Image src="/images/woman-holding-spray-cleaner-1.png" alt="" fill className="object-contain object-bottom" fetchPriority="high" loading="eager" sizes="(min-width: 1024px) 40vw, 0vw" />
        </div>
      </div>
    </section>
  );
}
