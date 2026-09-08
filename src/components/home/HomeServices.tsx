import Image from "next/image";
import type { Service } from "@/data/services";
import type { SiteData } from "@/data/site";
import type { TokenSource } from "@/content/interpolate";
import { t } from "@/content/interpolate";

// post-8.css 6cbc7976: padding 6/3/2rem. h2 176e9adf; intro 70c713c2 max 112rem, 3rem to the cards from 1280.
// Cards 33.33% from 768; the 4th/5th (7b8a2c27/5f81c296) get 6/3/1rem top padding. Button aeb05a4 1.9rem, 17px/30px.
export default function HomeServices({
  serviceIntro,
  services,
  innerSite,
  bits,
}: {
  serviceIntro: string[];
  services: Service[];
  innerSite: SiteData["innerSite"];
  bits: TokenSource;
}) {
  return (
    <section className="bg-white py-[2rem] md:py-[3rem] lg:py-[6rem]">
      <div className="ec flex flex-col">
        <h2 className="mb-[1rem] text-center text-[2.8rem] leading-[1.2em] font-bold md:mb-[2rem] md:text-[4rem] lg:text-[4.5rem]">
          {t("Professional Cleaning Services {city}, {state}", bits)}
        </h2>
        <div className="mx-auto max-w-[112rem] text-[1.7rem] leading-[1.5em] font-light md:text-[1.9rem] lg:mb-[1rem] lg:text-[2rem]">
          {serviceIntro.map((p) => (
            <p key={p.slice(0, 40)} className="mb-[2rem]">
              {p}
            </p>
          ))}
        </div>
        <div className="flex flex-wrap justify-center">
          {services.map((s, i) => (
            <article
              key={s.title}
              className={`w-full p-[1rem] text-center md:w-1/3 lg:p-[2rem] ${
                i >= 3 ? "md:pt-[3rem] lg:pt-[6rem]" : ""
              }`}
            >
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
        <div className="text-left md:text-center lg:mt-[3rem]">
          <a
            href={innerSite.phoneHref}
            className="bg-rust border-rust hover:text-rust inline-block rounded-[5px] border-[1px] px-[20px] py-[17px] text-[1.9rem] leading-[1.2em] font-bold tracking-[1px] text-white uppercase transition-colors hover:bg-white md:px-[30px]"
          >
            Call Us Now!
          </a>
        </div>
      </div>
    </section>
  );
}
